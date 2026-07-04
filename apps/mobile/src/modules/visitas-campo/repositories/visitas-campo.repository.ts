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
import { generateLocalId, generatePublicId } from "../../../shared/utils/local-id";
import type {
  CampaniaCatalogItem,
  CreateVisitaCampoDraft,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  RecentVisitaCampo,
  VariedadCatalogItem,
  SubEtapaCatalogItem,
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
  area_hectares: string | null;
  sowing_date: string | null;
  visit_date: string;
  start_visit_time: string;
  end_visit_time: string | null;
  phenological_stage_id: string | null;
  sub_etapa_id: string | null;
  sub_etapa_percentage: string | null;
  general_observation: string | null;
  agronomist_signature_name: string | null;
  producer_signature_name: string | null;
  visit_location: string | null;
  receta_anterior_json: string | null;
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
  sort_order: number | null;
  type: "Etapa" | "Labor";
  is_active: number;
};

type SubEtapaRow = {
  id: string;
  etapa_fenologica_id: string;
  name: string;
  sort_order: number;
  description: string | null;
  percentage: string | null;
  is_active: number;
};

type VisitDefaultsRow = {
  sowing_date: string | null;
  area_hectares: string | null;
  plants_count: number | null;
};

type RecentVisitaCampoRow = {
  local_id: string;
  parcela_id: string;
  parcela_name: string | null;
  productor_id: string | null;
  first_name: string | null;
  last_name: string | null;
  visit_date: string;
  start_visit_time: string;
  sync_status: SyncStatus;
  created_at: string;
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
  areaHectares: string | null;
  sowingDate: string | null;
  visitDate: string;
  startVisitTime: string;
  endVisitTime: string | null;
  phenologicalStageId: string | null;
  subEtapaId: string | null;
  subEtapaPercentage: number | null;
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
  area_hectares,
  sowing_date,
  visit_date,
  start_visit_time,
  end_visit_time,
  phenological_stage_id,
  sub_etapa_id,
  sub_etapa_percentage,
  general_observation,
  agronomist_signature_name,
  producer_signature_name,
  visit_location,
  receta_anterior_json,
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

  getRecentByAgronomistUserId(agronomistUserId: string, limit = 3) {
    const db = getDatabase();
    const rows = db.getAllSync<RecentVisitaCampoRow>(
      `SELECT
         visita.local_id,
         visita.parcela_id,
         parcela.name AS parcela_name,
         parcela.productor_id,
         productor.first_name,
         productor.last_name,
         visita.visit_date,
         visita.start_visit_time,
         visita.sync_status,
         visita.created_at
       FROM visitas_campo visita
       LEFT JOIN parcelas parcela ON parcela.id = visita.parcela_id
       LEFT JOIN productores productor ON productor.id = parcela.productor_id
       WHERE visita.agronomist_user_id = ? AND visita.is_active = 1
       ORDER BY visita.created_at DESC
       LIMIT ?`,
      agronomistUserId,
      Math.max(0, Math.trunc(limit))
    );

    return rows.map(mapRecentVisitaCampoRow);
  },

  getByAgronomistUserId(agronomistUserId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<RecentVisitaCampoRow>(
      `SELECT
         visita.local_id,
         visita.parcela_id,
         parcela.name AS parcela_name,
         parcela.productor_id,
         productor.first_name,
         productor.last_name,
         visita.visit_date,
         visita.start_visit_time,
         visita.sync_status,
         visita.created_at
       FROM visitas_campo visita
       LEFT JOIN parcelas parcela ON parcela.id = visita.parcela_id
       LEFT JOIN productores productor ON productor.id = parcela.productor_id
       WHERE visita.agronomist_user_id = ? AND visita.is_active = 1
       ORDER BY visita.visit_date DESC, visita.start_visit_time DESC, visita.created_at DESC`,
      agronomistUserId
    );

    return rows.map(mapRecentVisitaCampoRow);
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

  updateRecetaAnterior(localId: string, recetaAnteriorJson: string | null) {
    const db = getDatabase();
    db.runSync(
      `UPDATE visitas_campo
       SET receta_anterior_json = ?,
           updated_at = ?
       WHERE local_id = ?`,
      [recetaAnteriorJson, getNowIsoString(), localId]
    );
  },

  getLastVisitDefaultsByParcelaId(parcelaId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<VisitDefaultsRow>(
      `SELECT sowing_date, area_hectares, plants_count
       FROM visitas_campo
       WHERE parcela_id = ?
         AND is_active = 1
         AND (
           sowing_date IS NOT NULL
           OR area_hectares IS NOT NULL
           OR plants_count IS NOT NULL
         )
       ORDER BY visit_date DESC, start_visit_time DESC, created_at DESC
       LIMIT 1`,
      parcelaId
    );

    return row
      ? {
          sowingDate: row.sowing_date,
          areaHectares: row.area_hectares,
          plantsCount: row.plants_count
        }
      : null;
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
          area_hectares,
          sowing_date,
          visit_date,
          start_visit_time,
          end_visit_time,
          phenological_stage_id,
          sub_etapa_id,
          sub_etapa_percentage,
          general_observation,
          agronomist_signature_name,
          producer_signature_name,
          visit_location,
          synchronized_at,
          is_active,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        input.areaHectares ?? null,
        input.sowingDate ?? null,
        input.visitDate,
        input.startVisitTime,
        input.endVisitTime ?? null,
        input.phenologicalStageId ?? null,
        input.subEtapaId ?? null,
        input.subEtapaPercentage === undefined || input.subEtapaPercentage === null
          ? null
          : String(input.subEtapaPercentage),
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

    if (data.areaHectares !== undefined) {
      sets.push("area_hectares = ?");
      params.push(data.areaHectares);
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

    if (data.subEtapaId !== undefined) {
      sets.push("sub_etapa_id = ?");
      params.push(data.subEtapaId);
    }

    if (data.subEtapaPercentage !== undefined) {
      sets.push("sub_etapa_percentage = ?");
      params.push(
        data.subEtapaPercentage === null ? null : String(data.subEtapaPercentage)
      );
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

      const isSyncUpdate = data.syncStatus !== undefined || data.serverId !== undefined;

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
      `SELECT id, cultivo_id, name, description, sort_order, type, is_active
       FROM etapas_fenologicas
       WHERE cultivo_id = ?
       ORDER BY sort_order IS NULL ASC, sort_order ASC, name ASC, id ASC`,
      cultivoId
    );

    return rows.map((row) => ({
      id: row.id,
      cultivoId: row.cultivo_id,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
      type: row.type,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies EtapaFenologicaCatalogItem[];
  },

  getSubEtapasByEtapaFenologica(etapaFenologicaId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<SubEtapaRow>(
      `SELECT id, etapa_fenologica_id, name, sort_order, description, percentage, is_active
       FROM sub_etapas
       WHERE etapa_fenologica_id = ? AND is_active = 1
       ORDER BY sort_order ASC, name ASC, id ASC`,
      etapaFenologicaId
    );

    return rows
      .map(mapSubEtapaRow)
      .filter((subEtapa) => normalizeCatalogName(subEtapa.name) !== "caida de petalos")
      .map(applySubEtapaLocalOverrides)
      .sort((leftSubEtapa, rightSubEtapa) => {
        if (leftSubEtapa.sortOrder !== rightSubEtapa.sortOrder) {
          return leftSubEtapa.sortOrder - rightSubEtapa.sortOrder;
        }

        return leftSubEtapa.name.localeCompare(rightSubEtapa.name);
      }) satisfies SubEtapaCatalogItem[];
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
    areaHectares: row.area_hectares,
    sowingDate: row.sowing_date,
    visitDate: row.visit_date,
    startVisitTime: row.start_visit_time,
    endVisitTime: row.end_visit_time,
    phenologicalStageId: row.phenological_stage_id,
    subEtapaId: row.sub_etapa_id,
    subEtapaPercentage:
      row.sub_etapa_percentage === null ? null : Number(row.sub_etapa_percentage),
    generalObservation: row.general_observation,
    agronomistSignatureName: row.agronomist_signature_name,
    producerSignatureName: row.producer_signature_name,
    visitLocation: normalizeGeoJsonPoint(parseNullableJson(row.visit_location)),
    recetaAnteriorJson: row.receta_anterior_json,
    synchronizedAt: row.synchronized_at,
    syncErrorMessage: row.sync_error_message,
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSubEtapaRow(row: SubEtapaRow): SubEtapaCatalogItem {
  return {
    id: row.id,
    etapaFenologicaId: row.etapa_fenologica_id,
    name: row.name,
    sortOrder: row.sort_order,
    description: row.description,
    percentage: row.percentage === null ? null : Number(row.percentage),
    isActive: fromSqliteBoolean(row.is_active)
  };
}

function applySubEtapaLocalOverrides(subEtapa: SubEtapaCatalogItem): SubEtapaCatalogItem {
  switch (normalizeCatalogName(subEtapa.name)) {
    case "cuajado inicial":
      return {
        ...subEtapa,
        sortOrder: 1,
        percentage: 0
      };
    case "definicion amarre de frutos":
      return {
        ...subEtapa,
        sortOrder: 2,
        percentage: 50
      };
    case "consolidacion amarre total":
      return {
        ...subEtapa,
        sortOrder: 3,
        percentage: 100
      };
    default:
      return subEtapa;
  }
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function mapRecentVisitaCampoRow(row: RecentVisitaCampoRow): RecentVisitaCampo {
  const productorName = [row.first_name, row.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || null;

  return {
    id: row.local_id,
    parcelaId: row.parcela_id,
    parcelaName: row.parcela_name,
    productorId: row.productor_id || null,
    productorName,
    visitDate: row.visit_date,
    startVisitTime: row.start_visit_time,
    syncStatus: row.sync_status,
    createdAt: row.created_at
  };
}
