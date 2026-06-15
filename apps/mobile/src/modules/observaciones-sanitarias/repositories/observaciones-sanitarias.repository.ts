import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import {
  fromSqliteBoolean,
  getNowIsoString
} from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseByStageItem,
  PestDiseaseCatalogItem,
  PestDiseaseStageLevelCatalogItem,
  OrganoAfectado,
  VisitaObservacionSanitaria
} from "../types";

type SyncStatus = "pending" | "synced" | "error";

type ObservacionRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  pest_disease_id: string;
  incidence_level_id: string | null;
  severity_level_id: string | null;
  observation: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type ObservacionOrganoRow = {
  local_id: string;
  visita_observacion_sanitaria_local_id: string;
  organo: OrganoAfectado;
  created_at: string;
};

type PestDiseaseRow = {
  id: string;
  scientific_name: string | null;
  name: string;
  type: string;
  is_active: number;
};

type PestDiseaseStageLevelRow = {
  id: string;
  pest_disease_id: string;
  phenological_stage_id: string;
  incidence_severity_level_id: string;
  description: string | null;
  is_active: number;
};

type IncidenceLevelRow = {
  id: string;
  name: string;
  sort_order: number;
  type: "incidencia" | "severidad";
};

type CreateObservacionInput = {
  pestDiseaseId: string;
  incidenceLevelId?: string | null;
  severityLevelId?: string | null;
  observation?: string;
  organosAfectados: OrganoAfectado[];
};

type UpdateObservacionInput = {
  pestDiseaseId?: string;
  incidenceLevelId?: string | null;
  severityLevelId?: string | null;
  observation?: string | null;
  organosAfectados?: OrganoAfectado[];
  serverId?: string | null;
  syncStatus?: SyncStatus;
};

const OBSERVACION_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  pest_disease_id,
  incidence_level_id,
  severity_level_id,
  observation,
  sync_status,
  created_at,
  updated_at
`;

export const observacionesSanitariasRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<ObservacionRow>(
      `SELECT ${OBSERVACION_COLUMNS}
       FROM visita_observaciones_sanitarias
       ORDER BY created_at DESC`
    );

    return rows.map((row) =>
      mapObservacionRow(row, getOrganosByObservacionId(row.local_id))
    );
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<ObservacionRow>(
      `SELECT ${OBSERVACION_COLUMNS}
       FROM visita_observaciones_sanitarias
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapObservacionRow(row, getOrganosByObservacionId(row.local_id)) : null;
  },

  getByVisitaLocalId(visitaLocalId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<ObservacionRow>(
      `SELECT ${OBSERVACION_COLUMNS}
       FROM visita_observaciones_sanitarias
       WHERE visita_local_id = ?
       ORDER BY created_at ASC`,
      visitaLocalId
    );

    return rows.map((row) =>
      mapObservacionRow(row, getOrganosByObservacionId(row.local_id))
    );
  },

  insert(input: CreateObservacionInput, visitaLocalId: string) {
    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_observaciones_sanitarias (
          local_id,
          server_id,
          visita_local_id,
          pest_disease_id,
          incidence_level_id,
          severity_level_id,
          observation,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        visitaLocalId,
        input.pestDiseaseId,
        input.incidenceLevelId ?? null,
        input.severityLevelId ?? null,
        input.observation ?? null,
        "pending",
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visita_observaciones_sanitarias",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
      replaceOrganosByObservacionId(db, localId, input.organosAfectados, timestamp);
    });

    const observacion = this.getById(localId);

    if (!observacion) {
      throw new Error("No se pudo guardar la observacion local.");
    }

    return observacion;
  },

  update(localId: string, data: UpdateObservacionInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | null> = [];

    if (data.pestDiseaseId !== undefined) {
      sets.push("pest_disease_id = ?");
      params.push(data.pestDiseaseId);
    }

    if (data.incidenceLevelId !== undefined) {
      sets.push("incidence_level_id = ?");
      params.push(data.incidenceLevelId);
    }

    if (data.severityLevelId !== undefined) {
      sets.push("severity_level_id = ?");
      params.push(data.severityLevelId);
    }

    if (data.observation !== undefined) {
      sets.push("observation = ?");
      params.push(data.observation);
    }

    if (data.serverId !== undefined) {
      sets.push("server_id = ?");
      params.push(data.serverId);
    }

    if (data.syncStatus !== undefined) {
      sets.push("sync_status = ?");
      params.push(data.syncStatus);
    }

    sets.push("updated_at = ?");
    params.push(timestamp);
    params.push(localId);

    db.withTransactionSync(() => {
      const result = db.runSync(
        `UPDATE visita_observaciones_sanitarias
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la observacion local para actualizar.");
      }

      const isSyncUpdate = data.syncStatus !== undefined || data.serverId !== undefined;

      if (data.organosAfectados !== undefined) {
        replaceOrganosByObservacionId(db, localId, data.organosAfectados, timestamp);
      }

      if (!isSyncUpdate) {
        db.runSync(
          `UPDATE visita_observaciones_sanitarias SET sync_status = 'pending' WHERE local_id = ?`,
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visita_observaciones_sanitarias",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const observacion = this.getById(localId);

    if (!observacion) {
      throw new Error("No se pudo leer la observacion actualizada.");
    }

    return observacion;
  },

  deleteById(localId: string) {
    const db = getDatabase();
    const existing = this.getById(localId);
    const payload = existing?.serverId
      ? JSON.stringify({ serverId: existing.serverId })
      : null;

    db.withTransactionSync(() => {
      insertSyncOutboxEntry(db, {
        entityType: "visita_observaciones_sanitarias",
        entityLocalId: localId,
        operation: "delete",
        payload,
        createdAt: getNowIsoString()
      });

      db.runSync(
        `DELETE FROM visita_observacion_sanitaria_organos
         WHERE visita_observacion_sanitaria_local_id = ?`,
        localId
      );

      const result = db.runSync(
        `DELETE FROM visita_observaciones_sanitarias
         WHERE local_id = ?`,
        localId
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la observacion local para eliminar.");
      }
    });
  },

  getPestDiseases() {
    const db = getDatabase();
    const rows = db.getAllSync<PestDiseaseRow>(
      `SELECT id, scientific_name, name, type, is_active
       FROM pest_diseases
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      scientificName: row.scientific_name,
      name: row.name,
      type: row.type,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies PestDiseaseCatalogItem[];
  },

  getPestDiseasesByPhenologicalStage(
    phenologicalStageId: string
  ): PestDiseaseByStageItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<PestDiseaseRow>(
      `SELECT DISTINCT pest.id, pest.scientific_name, pest.name, pest.type, pest.is_active
       FROM pest_diseases pest
       INNER JOIN pest_disease_stage_levels relation
         ON relation.pest_disease_id = pest.id
       WHERE relation.phenological_stage_id = ?
         AND relation.is_active = 1
         AND pest.is_active = 1
       ORDER BY pest.type ASC, pest.name ASC, pest.id ASC`,
      phenologicalStageId
    );

    return rows.map((row) => ({
      id: row.id,
      scientificName: row.scientific_name,
      name: row.name,
      type: row.type,
      isActive: fromSqliteBoolean(row.is_active),
      stageLevels: this.getStageLevelsByPestDiseaseAndStage(row.id, phenologicalStageId)
    }));
  },

  getStageLevelsByPestDiseaseAndStage(
    pestDiseaseId: string,
    phenologicalStageId: string
  ): PestDiseaseStageLevelCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<PestDiseaseStageLevelRow>(
      `SELECT id,
              pest_disease_id,
              phenological_stage_id,
              incidence_severity_level_id,
              description,
              is_active
       FROM pest_disease_stage_levels
       WHERE pest_disease_id = ?
         AND phenological_stage_id = ?
         AND is_active = 1
       ORDER BY incidence_severity_level_id ASC`,
      pestDiseaseId,
      phenologicalStageId
    );

    return rows.map((row) => ({
      id: row.id,
      plagaEnfermedadId: row.pest_disease_id,
      etapaFenologicaId: row.phenological_stage_id,
      nivelIncidenciaSeveridadId: row.incidence_severity_level_id,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active)
    }));
  },

  getIncidenceLevels() {
    const db = getDatabase();
    const rows = db.getAllSync<IncidenceLevelRow>(
      `SELECT id, name, sort_order, type
       FROM incidence_levels
       ORDER BY type ASC, sort_order ASC, name ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      type: row.type
    })) satisfies IncidenceLevelCatalogItem[];
  }
};

function getOrganosByObservacionId(localId: string) {
  const db = getDatabase();
  const rows = db.getAllSync<ObservacionOrganoRow>(
    `SELECT local_id,
            visita_observacion_sanitaria_local_id,
            organo,
            created_at
     FROM visita_observacion_sanitaria_organos
     WHERE visita_observacion_sanitaria_local_id = ?
     ORDER BY created_at ASC, organo ASC`,
    localId
  );

  return rows.map((row) => row.organo);
}

function replaceOrganosByObservacionId(
  db: ReturnType<typeof getDatabase>,
  observacionLocalId: string,
  organosAfectados: OrganoAfectado[],
  timestamp: string
) {
  db.runSync(
    `DELETE FROM visita_observacion_sanitaria_organos
     WHERE visita_observacion_sanitaria_local_id = ?`,
    observacionLocalId
  );

  for (const organo of [...new Set(organosAfectados)]) {
    db.runSync(
      `INSERT INTO visita_observacion_sanitaria_organos (
        local_id,
        visita_observacion_sanitaria_local_id,
        organo,
        created_at
      ) VALUES (?, ?, ?, ?)`,
      generateLocalId(),
      observacionLocalId,
      organo,
      timestamp
    );
  }
}

function mapObservacionRow(
  row: ObservacionRow,
  organosAfectados: OrganoAfectado[]
): VisitaObservacionSanitaria {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    visitaId: row.visita_local_id,
    pestDiseaseId: row.pest_disease_id,
    incidenceLevelId: row.incidence_level_id,
    severityLevelId: row.severity_level_id,
    observation: row.observation,
    organosAfectados,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
