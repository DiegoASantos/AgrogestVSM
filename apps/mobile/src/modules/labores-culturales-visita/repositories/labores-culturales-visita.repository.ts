import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import {
  fromSqliteBoolean,
  getNowIsoString
} from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type { LaborCulturalCatalogItem, VisitaLaborCultural } from "../types";

type SyncStatus = "pending" | "synced" | "error";

type LaborCulturalRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
};

type VisitaLaborCulturalRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  labor_cultural_id: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type CreateLaborInput = {
  laborCulturalId: string;
};

type UpdateLaborInput = {
  serverId?: string | null;
  syncStatus?: SyncStatus;
};

const LABOR_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  labor_cultural_id,
  sync_status,
  created_at,
  updated_at
`;

export const laboresCulturalesVisitaRepository = {
  getLaboresCulturales() {
    const db = getDatabase();
    const rows = db.getAllSync<LaborCulturalRow>(
      `SELECT id, name, description, is_active
       FROM labores_culturales
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies LaborCulturalCatalogItem[];
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<VisitaLaborCulturalRow>(
      `SELECT ${LABOR_COLUMNS}
       FROM visita_labores_culturales
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapLaborRow(row) : null;
  },

  getByVisitaLocalId(visitaLocalId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<VisitaLaborCulturalRow>(
      `SELECT ${LABOR_COLUMNS}
       FROM visita_labores_culturales
       WHERE visita_local_id = ?
       ORDER BY created_at ASC`,
      visitaLocalId
    );

    return rows.map(mapLaborRow);
  },

  getByVisitaAndLabor(visitaLocalId: string, laborCulturalId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<VisitaLaborCulturalRow>(
      `SELECT ${LABOR_COLUMNS}
       FROM visita_labores_culturales
       WHERE visita_local_id = ?
         AND labor_cultural_id = ?
       LIMIT 1`,
      visitaLocalId,
      laborCulturalId
    );

    return row ? mapLaborRow(row) : null;
  },

  insert(input: CreateLaborInput, visitaLocalId: string) {
    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_labores_culturales (
          local_id,
          server_id,
          visita_local_id,
          labor_cultural_id,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        visitaLocalId,
        input.laborCulturalId,
        "pending",
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visita_labores_culturales",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const labor = this.getById(localId);

    if (!labor) {
      throw new Error("No se pudo guardar la labor cultural local.");
    }

    return labor;
  },

  update(localId: string, data: UpdateLaborInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | null> = [];

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
        `UPDATE visita_labores_culturales
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la labor cultural local para actualizar.");
      }
    });

    const labor = this.getById(localId);

    if (!labor) {
      throw new Error("No se pudo leer la labor cultural actualizada.");
    }

    return labor;
  },

  deleteById(localId: string) {
    const db = getDatabase();
    const existing = this.getById(localId);
    const payload = existing?.serverId
      ? JSON.stringify({ serverId: existing.serverId })
      : null;

    db.withTransactionSync(() => {
      insertSyncOutboxEntry(db, {
        entityType: "visita_labores_culturales",
        entityLocalId: localId,
        operation: "delete",
        payload,
        createdAt: getNowIsoString()
      });

      const result = db.runSync(
        `DELETE FROM visita_labores_culturales
         WHERE local_id = ?`,
        localId
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la labor cultural local para eliminar.");
      }
    });
  }
};

function mapLaborRow(row: VisitaLaborCulturalRow): VisitaLaborCultural {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    visitaId: row.visita_local_id,
    laborCulturalId: row.labor_cultural_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
