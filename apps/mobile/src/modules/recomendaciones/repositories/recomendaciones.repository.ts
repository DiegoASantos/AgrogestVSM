import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import {
  fromSqliteBoolean,
  getNowIsoString,
  toSqliteBoolean
} from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type {
  RecommendationTypeCatalogItem,
  VisitaRecomendacion
} from "../types";

type SyncStatus = "pending" | "synced" | "error";

type RecomendacionRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  recommendation_type_id: string;
  applies: number;
  detail: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type RecommendationTypeRow = {
  id: string;
  name: string;
  is_active: number;
};

type CreateRecomendacionInput = {
  recommendationTypeId: string;
  applies: boolean;
  detail?: string;
};

type UpdateRecomendacionInput = {
  recommendationTypeId?: string;
  applies?: boolean;
  detail?: string | null;
  serverId?: string | null;
  syncStatus?: SyncStatus;
};

const RECOMENDACION_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  recommendation_type_id,
  applies,
  detail,
  sync_status,
  created_at,
  updated_at
`;

export const recomendacionesRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<RecomendacionRow>(
      `SELECT ${RECOMENDACION_COLUMNS}
       FROM visita_recomendaciones
       ORDER BY created_at DESC`
    );

    return rows.map(mapRecomendacionRow);
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<RecomendacionRow>(
      `SELECT ${RECOMENDACION_COLUMNS}
       FROM visita_recomendaciones
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapRecomendacionRow(row) : null;
  },

  getByVisitaLocalId(visitaLocalId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<RecomendacionRow>(
      `SELECT ${RECOMENDACION_COLUMNS}
       FROM visita_recomendaciones
       WHERE visita_local_id = ?
       ORDER BY created_at ASC`,
      visitaLocalId
    );

    return rows.map(mapRecomendacionRow);
  },

  insert(input: CreateRecomendacionInput, visitaLocalId: string) {
    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_recomendaciones (
          local_id,
          server_id,
          visita_local_id,
          recommendation_type_id,
          applies,
          detail,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        visitaLocalId,
        input.recommendationTypeId,
        toSqliteBoolean(input.applies),
        input.detail ?? null,
        "pending",
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visita_recomendaciones",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const recomendacion = this.getById(localId);

    if (!recomendacion) {
      throw new Error("No se pudo guardar la recomendacion local.");
    }

    return recomendacion;
  },

  update(localId: string, data: UpdateRecomendacionInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | number | null> = [];

    if (data.recommendationTypeId !== undefined) {
      sets.push("recommendation_type_id = ?");
      params.push(data.recommendationTypeId);
    }

    if (data.applies !== undefined) {
      sets.push("applies = ?");
      params.push(toSqliteBoolean(data.applies));
    }

    if (data.detail !== undefined) {
      sets.push("detail = ?");
      params.push(data.detail);
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
        `UPDATE visita_recomendaciones
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la recomendacion local para actualizar.");
      }

      const isSyncUpdate =
        data.syncStatus !== undefined || data.serverId !== undefined;

      if (!isSyncUpdate) {
        db.runSync(
          `UPDATE visita_recomendaciones SET sync_status = 'pending' WHERE local_id = ?`,
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visita_recomendaciones",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const recomendacion = this.getById(localId);

    if (!recomendacion) {
      throw new Error("No se pudo leer la recomendacion actualizada.");
    }

    return recomendacion;
  },

  deleteById(localId: string) {
    const db = getDatabase();
    const existing = this.getById(localId);
    const payload = existing?.serverId
      ? JSON.stringify({ serverId: existing.serverId })
      : null;

    db.withTransactionSync(() => {
      insertSyncOutboxEntry(db, {
        entityType: "visita_recomendaciones",
        entityLocalId: localId,
        operation: "delete",
        payload,
        createdAt: getNowIsoString()
      });

      const result = db.runSync(
        `DELETE FROM visita_recomendaciones
         WHERE local_id = ?`,
        localId
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la recomendacion local para eliminar.");
      }
    });
  },

  getRecommendationTypes() {
    const db = getDatabase();
    const rows = db.getAllSync<RecommendationTypeRow>(
      `SELECT id, name, is_active
       FROM recommendation_types
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies RecommendationTypeCatalogItem[];
  }
};

function mapRecomendacionRow(row: RecomendacionRow): VisitaRecomendacion {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    visitaId: row.visita_local_id,
    recommendationTypeId: row.recommendation_type_id,
    applies: fromSqliteBoolean(row.applies),
    detail: row.detail,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
