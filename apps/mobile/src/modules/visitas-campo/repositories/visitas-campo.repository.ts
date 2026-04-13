import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import {
  fromSqliteBoolean,
  getNowIsoString,
  parseNullableJson,
  stringifyNullableJson,
  toSqliteBoolean
} from "../../../shared/database/sqlite-utils";
import {
  normalizeGeoJsonPoint,
  type GeoJsonPointGeometry
} from "../../../shared/maps/geo";
import {
  generateLocalId,
  generatePublicId
} from "../../../shared/utils/local-id";
import type {
  CampaniaCatalogItem,
  CreateVisitaCampoDraft,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  VariedadCatalogItem,
  VisitaCampo
} from "../types";

type SyncStatus = "pending" | "synced" | "error";

type VisitaCampoRow = {
  local_id: string;
  server_id: string | null;
  public_id: string | null;
  nro_ficha: string | null;
  crop_id: string;
  variety_id: string;
  parcela_id: string;
  campaign_id: string;
  agronomist_user_id: string;
  plants_count: number | null;
  sowing_date: string | null;
  visit_date: string;
  start_visit_time: string;
  end_visit_time: string | null;
  phenological_stage_id: string | null;
  general_observation: string | null;
  agronomist_signature_name: string | null;
  producer_signature_name: string | null;
  visit_location: string | null;
  synchronized_at: string | null;
  sync_error_message: string | null;
  is_active: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type CultivoRow = {
  id: string;
  code: string;
  name: string;
  is_active: number;
};

type VariedadRow = {
  id: string;
  cultivo_id: string;
  code: string;
  name: string;
  is_active: number;
};

type CampaniaRow = {
  id: string;
  cultivo_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_active: number;
};

type EtapaFenologicaRow = {
  id: string;
  cultivo_id: string;
  name: string;
  description: string | null;
  is_active: number;
};

type CreateLocalVisitaCampoInput = CreateVisitaCampoDraft & {
  agronomistUserId: string;
};

type UpdateVisitaCampoInput = Partial<{
  serverId: string | null;
  syncStatus: SyncStatus;
  publicId: string | null;
  nroFicha: string | null;
  cropId: string;
  varietyId: string;
  parcelaId: string;
  campaignId: string;
  agronomistUserId: string;
  plantsCount: number | null;
  sowingDate: string | null;
  visitDate: string;
  startVisitTime: string;
  endVisitTime: string | null;
  phenologicalStageId: string | null;
  generalObservation: string | null;
  agronomistSignatureName: string | null;
  producerSignatureName: string | null;
  visitLocation: GeoJsonPointGeometry | null;
  synchronizedAt: string | null;
  isActive: boolean;
}>;

const VISITA_COLUMNS = `
  local_id,
  server_id,
  public_id,
  nro_ficha,
  crop_id,
  variety_id,
  parcela_id,
  campaign_id,
  agronomist_user_id,
  plants_count,
  sowing_date,
  visit_date,
  start_visit_time,
  end_visit_time,
  phenological_stage_id,
  general_observation,
  agronomist_signature_name,
  producer_signature_name,
  visit_location,
  synchronized_at,
  sync_error_message,
  is_active,
  sync_status,
  created_at,
  updated_at
`;

export const visitasCampoRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<VisitaCampoRow>(
      `SELECT ${VISITA_COLUMNS}
       FROM visitas_campo
       ORDER BY visit_date DESC, created_at DESC`
    );

    return rows.map(mapVisitaCampoRow);
  },

  getByParcelaId(parcelaId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<VisitaCampoRow>(
      `SELECT ${VISITA_COLUMNS}
       FROM visitas_campo
       WHERE parcela_id = ? AND is_active = 1
       ORDER BY visit_date DESC, start_visit_time DESC, created_at DESC`,
      parcelaId
    );

    return rows.map(mapVisitaCampoRow);
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<VisitaCampoRow>(
      `SELECT ${VISITA_COLUMNS}
       FROM visitas_campo
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapVisitaCampoRow(row) : null;
  },

  insert(input: CreateLocalVisitaCampoInput) {
    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();
    const publicId = generatePublicId();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visitas_campo (
          local_id,
          server_id,
          public_id,
          nro_ficha,
          crop_id,
          variety_id,
          parcela_id,
          campaign_id,
          agronomist_user_id,
          plants_count,
          sowing_date,
          visit_date,
          start_visit_time,
          end_visit_time,
          phenological_stage_id,
          general_observation,
          agronomist_signature_name,
          producer_signature_name,
          visit_location,
          synchronized_at,
          is_active,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        publicId,
        null,
        input.cropId,
        input.varietyId,
        input.parcelaId,
        input.campaignId,
        input.agronomistUserId,
        input.plantsCount ?? null,
        input.sowingDate ?? null,
        input.visitDate,
        input.startVisitTime,
        input.endVisitTime ?? null,
        input.phenologicalStageId ?? null,
        input.generalObservation ?? null,
        null,
        null,
        stringifyNullableJson(input.visitLocation ?? null),
        null,
        1,
        "pending",
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visitas_campo",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const visita = this.getById(localId);

    if (!visita) {
      throw new Error("No se pudo guardar la visita local.");
    }

    return visita;
  },

  update(localId: string, data: UpdateVisitaCampoInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | number | null> = [];

    if (data.serverId !== undefined) {
      sets.push("server_id = ?");
      params.push(data.serverId);
    }

    if (data.syncStatus !== undefined) {
      sets.push("sync_status = ?");
      params.push(data.syncStatus);
    }

    if (data.publicId !== undefined) {
      sets.push("public_id = ?");
      params.push(data.publicId);
    }

    if (data.nroFicha !== undefined) {
      sets.push("nro_ficha = ?");
      params.push(data.nroFicha);
    }

    if (data.cropId !== undefined) {
      sets.push("crop_id = ?");
      params.push(data.cropId);
    }

    if (data.varietyId !== undefined) {
      sets.push("variety_id = ?");
      params.push(data.varietyId);
    }

    if (data.parcelaId !== undefined) {
      sets.push("parcela_id = ?");
      params.push(data.parcelaId);
    }

    if (data.campaignId !== undefined) {
      sets.push("campaign_id = ?");
      params.push(data.campaignId);
    }

    if (data.agronomistUserId !== undefined) {
      sets.push("agronomist_user_id = ?");
      params.push(data.agronomistUserId);
    }

    if (data.plantsCount !== undefined) {
      sets.push("plants_count = ?");
      params.push(data.plantsCount);
    }

    if (data.sowingDate !== undefined) {
      sets.push("sowing_date = ?");
      params.push(data.sowingDate);
    }

    if (data.visitDate !== undefined) {
      sets.push("visit_date = ?");
      params.push(data.visitDate);
    }

    if (data.startVisitTime !== undefined) {
      sets.push("start_visit_time = ?");
      params.push(data.startVisitTime);
    }

    if (data.endVisitTime !== undefined) {
      sets.push("end_visit_time = ?");
      params.push(data.endVisitTime);
    }

    if (data.phenologicalStageId !== undefined) {
      sets.push("phenological_stage_id = ?");
      params.push(data.phenologicalStageId);
    }

    if (data.generalObservation !== undefined) {
      sets.push("general_observation = ?");
      params.push(data.generalObservation);
    }

    if (data.agronomistSignatureName !== undefined) {
      sets.push("agronomist_signature_name = ?");
      params.push(data.agronomistSignatureName);
    }

    if (data.producerSignatureName !== undefined) {
      sets.push("producer_signature_name = ?");
      params.push(data.producerSignatureName);
    }

    if (data.visitLocation !== undefined) {
      sets.push("visit_location = ?");
      params.push(stringifyNullableJson(data.visitLocation));
    }

    if (data.synchronizedAt !== undefined) {
      sets.push("synchronized_at = ?");
      params.push(data.synchronizedAt);
    }

    if (data.isActive !== undefined) {
      sets.push("is_active = ?");
      params.push(toSqliteBoolean(data.isActive));
    }

    sets.push("updated_at = ?");
    params.push(timestamp);
    params.push(localId);

    db.withTransactionSync(() => {
      const result = db.runSync(
        `UPDATE visitas_campo
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la visita local para actualizar.");
      }

      const isSyncUpdate =
        data.syncStatus !== undefined || data.serverId !== undefined;

      if (!isSyncUpdate) {
        db.runSync(
          `UPDATE visitas_campo SET sync_status = 'pending' WHERE local_id = ?`,
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visitas_campo",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const visita = this.getById(localId);

    if (!visita) {
      throw new Error("No se pudo leer la visita actualizada.");
    }

    return visita;
  },

  deleteById(localId: string) {
    const db = getDatabase();
    const existing = this.getById(localId);
    const payload = existing?.serverId
      ? JSON.stringify({ serverId: existing.serverId })
      : null;

    db.withTransactionSync(() => {
      insertSyncOutboxEntry(db, {
        entityType: "visitas_campo",
        entityLocalId: localId,
        operation: "delete",
        payload,
        createdAt: getNowIsoString()
      });

      const result = db.runSync(
        `DELETE FROM visitas_campo
         WHERE local_id = ?`,
        localId
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la visita local para eliminar.");
      }
    });
  },

  getCultivos() {
    const db = getDatabase();
    const rows = db.getAllSync<CultivoRow>(
      `SELECT id, code, name, is_active
       FROM cultivos
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies CultivoCatalogItem[];
  },

  getVariedadesByCultivo(cultivoId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<VariedadRow>(
      `SELECT id, cultivo_id, code, name, is_active
       FROM variedades
       WHERE cultivo_id = ?
       ORDER BY name ASC, id ASC`,
      cultivoId
    );

    return rows.map((row) => ({
      id: row.id,
      cultivoId: row.cultivo_id,
      code: row.code,
      name: row.name,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies VariedadCatalogItem[];
  },

  getCampaniasByCultivo(cultivoId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<CampaniaRow>(
      `SELECT id, cultivo_id, name, start_date, end_date, description, is_active
       FROM campanias
       WHERE cultivo_id = ? AND is_active = 1
       ORDER BY start_date DESC, name ASC`,
      cultivoId
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      cultivoId: row.cultivo_id,
      startDate: row.start_date,
      endDate: row.end_date,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies CampaniaCatalogItem[];
  },

  getEtapasFenologicasByCultivo(cultivoId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<EtapaFenologicaRow>(
      `SELECT id, cultivo_id, name, description, is_active
       FROM etapas_fenologicas
       WHERE cultivo_id = ?
       ORDER BY name ASC, id ASC`,
      cultivoId
    );

    return rows.map((row) => ({
      id: row.id,
      cultivoId: row.cultivo_id,
      name: row.name,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies EtapaFenologicaCatalogItem[];
  }
};

function mapVisitaCampoRow(row: VisitaCampoRow): VisitaCampo {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    publicId: row.public_id ?? row.local_id,
    nroFicha: row.nro_ficha,
    cropId: row.crop_id,
    varietyId: row.variety_id,
    parcelaId: row.parcela_id,
    campaignId: row.campaign_id,
    agronomistUserId: row.agronomist_user_id,
    plantsCount: row.plants_count,
    sowingDate: row.sowing_date,
    visitDate: row.visit_date,
    startVisitTime: row.start_visit_time,
    endVisitTime: row.end_visit_time,
    phenologicalStageId: row.phenological_stage_id,
    generalObservation: row.general_observation,
    agronomistSignatureName: row.agronomist_signature_name,
    producerSignatureName: row.producer_signature_name,
    visitLocation: normalizeGeoJsonPoint(parseNullableJson(row.visit_location)),
    synchronizedAt: row.synchronized_at,
    syncErrorMessage: row.sync_error_message,
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
