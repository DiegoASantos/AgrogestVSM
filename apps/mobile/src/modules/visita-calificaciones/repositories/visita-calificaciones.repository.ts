import { getDatabase } from "../../../shared/database/connection";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { generateLocalId } from "../../../shared/utils/local-id";
import type {
  CalificacionModulo,
  UpsertCalificacionInput,
  VisitaCalificacion
} from "../types";

type SyncStatus = "pending" | "synced" | "error";

type CalificacionRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  modulo: CalificacionModulo;
  puntaje: number;
  observacion: string | null;
  sync_status: SyncStatus;
  sync_error_message: string | null;
  created_at: string;
  updated_at: string;
};

type UpdateCalificacionInput = Partial<UpsertCalificacionInput> & {
  serverId?: string | null;
  syncStatus?: SyncStatus;
  syncErrorMessage?: string | null;
};

const CALIFICACION_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  modulo,
  puntaje,
  observacion,
  sync_status,
  sync_error_message,
  created_at,
  updated_at
`;

export const visitaCalificacionesRepository = {
  getById(localId: string) {
    const row = getDatabase().getFirstSync<CalificacionRow>(
      `SELECT ${CALIFICACION_COLUMNS}
       FROM visita_calificaciones
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapRow(row) : null;
  },

  getByVisitaLocalId(visitaLocalId: string) {
    const rows = getDatabase().getAllSync<CalificacionRow>(
      `SELECT ${CALIFICACION_COLUMNS}
       FROM visita_calificaciones
       WHERE visita_local_id = ?
       ORDER BY modulo ASC`,
      visitaLocalId
    );

    return rows.map(mapRow);
  },

  getByVisitaAndModulo(visitaLocalId: string, modulo: CalificacionModulo) {
    const row = getDatabase().getFirstSync<CalificacionRow>(
      `SELECT ${CALIFICACION_COLUMNS}
       FROM visita_calificaciones
       WHERE visita_local_id = ? AND modulo = ?
       LIMIT 1`,
      visitaLocalId,
      modulo
    );

    return row ? mapRow(row) : null;
  },

  upsert(visitaLocalId: string, input: UpsertCalificacionInput) {
    const existing = this.getByVisitaAndModulo(visitaLocalId, input.modulo);

    if (existing) {
      return this.update(existing.id, {
        puntaje: input.puntaje,
        observacion: input.observacion ?? null
      });
    }

    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_calificaciones (
          local_id,
          server_id,
          visita_local_id,
          modulo,
          puntaje,
          observacion,
          sync_status,
          sync_error_message,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        visitaLocalId,
        input.modulo,
        input.puntaje,
        input.observacion ?? null,
        "pending",
        null,
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visita_calificaciones",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const saved = this.getById(localId);

    if (!saved) {
      throw new Error("No se pudo guardar la calificacion local.");
    }

    return saved;
  },

  update(localId: string, input: UpdateCalificacionInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | number | null> = [];

    if (input.modulo !== undefined) {
      sets.push("modulo = ?");
      params.push(input.modulo);
    }

    if (input.puntaje !== undefined) {
      sets.push("puntaje = ?");
      params.push(input.puntaje);
    }

    if (input.observacion !== undefined) {
      sets.push("observacion = ?");
      params.push(input.observacion);
    }

    if (input.serverId !== undefined) {
      sets.push("server_id = ?");
      params.push(input.serverId);
    }

    if (input.syncStatus !== undefined) {
      sets.push("sync_status = ?");
      params.push(input.syncStatus);
    }

    if (input.syncErrorMessage !== undefined) {
      sets.push("sync_error_message = ?");
      params.push(input.syncErrorMessage);
    }

    sets.push("updated_at = ?");
    params.push(timestamp, localId);

    db.withTransactionSync(() => {
      const result = db.runSync(
        `UPDATE visita_calificaciones
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la calificacion local.");
      }

      const isSyncUpdate =
        input.serverId !== undefined ||
        input.syncStatus !== undefined ||
        input.syncErrorMessage !== undefined;

      if (!isSyncUpdate) {
        db.runSync(
          `UPDATE visita_calificaciones
           SET sync_status = 'pending', sync_error_message = NULL
           WHERE local_id = ?`,
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visita_calificaciones",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const updated = this.getById(localId);

    if (!updated) {
      throw new Error("No se pudo leer la calificacion actualizada.");
    }

    return updated;
  }
};

function mapRow(row: CalificacionRow): VisitaCalificacion {
  return {
    id: row.local_id,
    serverId: row.server_id,
    visitaId: row.visita_local_id,
    modulo: row.modulo,
    puntaje: row.puntaje,
    observacion: row.observacion,
    syncStatus: row.sync_status,
    syncErrorMessage: row.sync_error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
