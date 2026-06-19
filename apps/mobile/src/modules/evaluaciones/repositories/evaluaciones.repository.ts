import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type { OrganoAfectado } from "../../observaciones-sanitarias/types";
import type { VisitaEvaluacion } from "../types";

type SyncStatus = "pending" | "synced" | "error";

type EvaluacionRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  sort_order: number;
  incidence_percentage: string | null;
  percentage: string | null;
  description: string;
  organos_afectados: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type CreateEvaluacionInput = {
  order: number;
  incidencePercentage?: number | null;
  percentage?: number | null;
  description: string;
  organosAfectados?: OrganoAfectado[];
};

type UpdateEvaluacionInput = {
  order?: number;
  incidencePercentage?: number | null;
  percentage?: number | null;
  description?: string;
  organosAfectados?: OrganoAfectado[];
  serverId?: string | null;
  syncStatus?: SyncStatus;
};

const EVALUACION_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  sort_order,
  incidence_percentage,
  percentage,
  description,
  organos_afectados,
  sync_status,
  created_at,
  updated_at
`;

export const evaluacionesRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<EvaluacionRow>(
      `SELECT ${EVALUACION_COLUMNS}
       FROM visita_evaluaciones
       ORDER BY created_at DESC`
    );

    return rows.map(mapEvaluacionRow);
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<EvaluacionRow>(
      `SELECT ${EVALUACION_COLUMNS}
       FROM visita_evaluaciones
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapEvaluacionRow(row) : null;
  },

  getByVisitaLocalId(visitaLocalId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<EvaluacionRow>(
      `SELECT ${EVALUACION_COLUMNS}
       FROM visita_evaluaciones
       WHERE visita_local_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      visitaLocalId
    );

    return rows.map(mapEvaluacionRow);
  },

  insert(input: CreateEvaluacionInput, visitaLocalId: string) {
    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_evaluaciones (
          local_id,
          server_id,
          visita_local_id,
          sort_order,
          incidence_percentage,
          percentage,
          description,
          organos_afectados,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        visitaLocalId,
        input.order,
        input.incidencePercentage === undefined || input.incidencePercentage === null
          ? null
          : String(input.incidencePercentage),
        input.percentage === undefined || input.percentage === null
          ? null
          : String(input.percentage),
        input.description,
        serializeOrganos(input.organosAfectados ?? []),
        "pending",
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visita_evaluaciones",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const evaluacion = this.getById(localId);

    if (!evaluacion) {
      throw new Error("No se pudo guardar la evaluacion local.");
    }

    return evaluacion;
  },

  update(localId: string, data: UpdateEvaluacionInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | number | null> = [];

    if (data.order !== undefined) {
      sets.push("sort_order = ?");
      params.push(data.order);
    }

    if (data.percentage !== undefined) {
      sets.push("percentage = ?");
      params.push(data.percentage === null ? null : String(data.percentage));
    }

    if (data.incidencePercentage !== undefined) {
      sets.push("incidence_percentage = ?");
      params.push(
        data.incidencePercentage === null ? null : String(data.incidencePercentage)
      );
    }

    if (data.description !== undefined) {
      sets.push("description = ?");
      params.push(data.description);
    }

    if (data.organosAfectados !== undefined) {
      sets.push("organos_afectados = ?");
      params.push(serializeOrganos(data.organosAfectados));
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
        `UPDATE visita_evaluaciones
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la evaluacion local para actualizar.");
      }

      const isSyncUpdate = data.syncStatus !== undefined || data.serverId !== undefined;

      if (!isSyncUpdate) {
        db.runSync(
          `UPDATE visita_evaluaciones SET sync_status = 'pending' WHERE local_id = ?`,
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visita_evaluaciones",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const evaluacion = this.getById(localId);

    if (!evaluacion) {
      throw new Error("No se pudo leer la evaluacion actualizada.");
    }

    return evaluacion;
  },

  deleteById(localId: string) {
    const db = getDatabase();
    const existing = this.getById(localId);
    const payload = existing?.serverId
      ? JSON.stringify({ serverId: existing.serverId })
      : null;

    db.withTransactionSync(() => {
      insertSyncOutboxEntry(db, {
        entityType: "visita_evaluaciones",
        entityLocalId: localId,
        operation: "delete",
        payload,
        createdAt: getNowIsoString()
      });

      const result = db.runSync(
        `DELETE FROM visita_evaluaciones
         WHERE local_id = ?`,
        localId
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la evaluacion local para eliminar.");
      }
    });
  }
};

function mapEvaluacionRow(row: EvaluacionRow): VisitaEvaluacion {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    visitaId: row.visita_local_id,
    order: row.sort_order,
    incidencePercentage: row.incidence_percentage,
    percentage: row.percentage,
    description: row.description,
    organosAfectados: deserializeOrganos(row.organos_afectados),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serializeOrganos(organos: OrganoAfectado[]) {
  return JSON.stringify([...new Set(organos)]);
}

function deserializeOrganos(value: string | null): OrganoAfectado[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed)
      ? (parsed.filter((item) => typeof item === "string") as OrganoAfectado[])
      : [];
  } catch {
    return [];
  }
}
