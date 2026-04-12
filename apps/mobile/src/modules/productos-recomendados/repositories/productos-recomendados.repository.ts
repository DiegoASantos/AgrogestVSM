import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import {
  fromSqliteBoolean,
  getNowIsoString
} from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type {
  ApplicationFrequencyCatalogItem,
  ProductCatalogItem,
  VisitaProductoRecomendado
} from "../types";

type SyncStatus = "pending" | "synced" | "error";

type ProductoRecomendadoRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  product_id: string;
  dose: string;
  application_frequency_id: string | null;
  instructions: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  is_active: number;
};

type ApplicationFrequencyRow = {
  id: string;
  name: string;
  interval_days: number | null;
  is_active: number;
};

type CreateProductoRecomendadoInput = {
  productId: string;
  dose: string;
  applicationFrequencyId?: string;
  instructions?: string;
};

type UpdateProductoRecomendadoInput = {
  productId?: string;
  dose?: string;
  applicationFrequencyId?: string | null;
  instructions?: string | null;
  serverId?: string | null;
  syncStatus?: SyncStatus;
};

const PRODUCTO_RECOMENDADO_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  product_id,
  dose,
  application_frequency_id,
  instructions,
  sync_status,
  created_at,
  updated_at
`;

export const productosRecomendadosRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<ProductoRecomendadoRow>(
      `SELECT ${PRODUCTO_RECOMENDADO_COLUMNS}
       FROM visita_productos_recomendados
       ORDER BY created_at DESC`
    );

    return rows.map(mapProductoRecomendadoRow);
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<ProductoRecomendadoRow>(
      `SELECT ${PRODUCTO_RECOMENDADO_COLUMNS}
       FROM visita_productos_recomendados
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapProductoRecomendadoRow(row) : null;
  },

  getByVisitaLocalId(visitaLocalId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<ProductoRecomendadoRow>(
      `SELECT ${PRODUCTO_RECOMENDADO_COLUMNS}
       FROM visita_productos_recomendados
       WHERE visita_local_id = ?
       ORDER BY created_at ASC`,
      visitaLocalId
    );

    return rows.map(mapProductoRecomendadoRow);
  },

  insert(input: CreateProductoRecomendadoInput, visitaLocalId: string) {
    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_productos_recomendados (
          local_id,
          server_id,
          visita_local_id,
          product_id,
          dose,
          application_frequency_id,
          instructions,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        visitaLocalId,
        input.productId,
        input.dose,
        input.applicationFrequencyId ?? null,
        input.instructions ?? null,
        "pending",
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visita_productos_recomendados",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const productoRecomendado = this.getById(localId);

    if (!productoRecomendado) {
      throw new Error("No se pudo guardar el producto recomendado local.");
    }

    return productoRecomendado;
  },

  update(localId: string, data: UpdateProductoRecomendadoInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | null> = [];

    if (data.productId !== undefined) {
      sets.push("product_id = ?");
      params.push(data.productId);
    }

    if (data.dose !== undefined) {
      sets.push("dose = ?");
      params.push(data.dose);
    }

    if (data.applicationFrequencyId !== undefined) {
      sets.push("application_frequency_id = ?");
      params.push(data.applicationFrequencyId);
    }

    if (data.instructions !== undefined) {
      sets.push("instructions = ?");
      params.push(data.instructions);
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
        `UPDATE visita_productos_recomendados
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error(
          "No se encontro el producto recomendado local para actualizar."
        );
      }

      const isSyncUpdate =
        data.syncStatus !== undefined || data.serverId !== undefined;

      if (!isSyncUpdate) {
        db.runSync(
          `UPDATE visita_productos_recomendados SET sync_status = 'pending' WHERE local_id = ?`,
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visita_productos_recomendados",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const productoRecomendado = this.getById(localId);

    if (!productoRecomendado) {
      throw new Error("No se pudo leer el producto recomendado actualizado.");
    }

    return productoRecomendado;
  },

  deleteById(localId: string) {
    const db = getDatabase();
    const existing = this.getById(localId);
    const payload = existing?.serverId
      ? JSON.stringify({ serverId: existing.serverId })
      : null;

    db.withTransactionSync(() => {
      insertSyncOutboxEntry(db, {
        entityType: "visita_productos_recomendados",
        entityLocalId: localId,
        operation: "delete",
        payload,
        createdAt: getNowIsoString()
      });

      const result = db.runSync(
        `DELETE FROM visita_productos_recomendados
         WHERE local_id = ?`,
        localId
      );

      if (result.changes < 1) {
        throw new Error(
          "No se encontro el producto recomendado local para eliminar."
        );
      }
    });
  },

  getProducts() {
    const db = getDatabase();
    const rows = db.getAllSync<ProductRow>(
      `SELECT id, name, is_active
       FROM products
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies ProductCatalogItem[];
  },

  getApplicationFrequencies() {
    const db = getDatabase();
    const rows = db.getAllSync<ApplicationFrequencyRow>(
      `SELECT id, name, interval_days, is_active
       FROM application_frequencies
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      intervalDays: row.interval_days,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies ApplicationFrequencyCatalogItem[];
  }
};

function mapProductoRecomendadoRow(
  row: ProductoRecomendadoRow
): VisitaProductoRecomendado {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    visitaId: row.visita_local_id,
    productId: row.product_id,
    dose: row.dose,
    applicationFrequencyId: row.application_frequency_id,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
