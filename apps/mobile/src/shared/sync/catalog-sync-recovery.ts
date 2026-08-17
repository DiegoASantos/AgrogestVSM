import { getDatabase } from "../database/connection";
import { getCatalogSessionUserId } from "../database/catalog-session";
import { runInSafeTransactionSync } from "../database/safe-transaction";
import { getNowIsoString } from "../database/sqlite-utils";
import { notifySyncStatusChanged } from "./sync-events";
import { scheduleSync } from "./sync-requests";
import type { SyncEntityType } from "./sync-entities";

export type RecoverableCatalogEntityType =
  "ingredientes_activos" | "fertilizantes" | "marcas_producto";

const CATALOG_TABLES: Record<RecoverableCatalogEntityType, string> = {
  ingredientes_activos: "ingredientes_activos",
  fertilizantes: "fertilizantes",
  marcas_producto: "marcas_producto"
};

export function isRecoverableCatalogEntity(
  entityType: SyncEntityType
): entityType is RecoverableCatalogEntityType {
  return entityType in CATALOG_TABLES;
}

export function retryCatalogSyncFailure(
  entityType: RecoverableCatalogEntityType,
  entityLocalId: string
) {
  const db = getDatabase();
  const ownerUserId = requireOwner();
  requireOwnedFailure(db, ownerUserId, entityType, entityLocalId);
  const table = CATALOG_TABLES[entityType];
  const row = db.getFirstSync<{ server_id: string | null }>(
    `SELECT server_id FROM ${table} WHERE id = ? LIMIT 1`,
    entityLocalId
  );

  if (!row) {
    throw new Error("El registro local ya no existe.");
  }

  runInSafeTransactionSync(db, () => {
    db.runSync(
      `UPDATE ${table}
       SET sync_status = 'pending', sync_error_message = NULL, catalog_visible = 1
       WHERE id = ?`,
      entityLocalId
    );
    db.runSync(
      `DELETE FROM sync_outbox
       WHERE owner_user_id = ? AND entity_type = ? AND entity_local_id = ?`,
      ownerUserId,
      entityType,
      entityLocalId
    );
    db.runSync(
      `DELETE FROM sync_failures
       WHERE owner_user_id = ? AND entity_type = ? AND entity_local_id = ?`,
      ownerUserId,
      entityType,
      entityLocalId
    );
    db.runSync(
      `INSERT INTO sync_outbox (
         owner_user_id, entity_type, entity_local_id, operation, payload,
         retry_count, created_at
       ) VALUES (?, ?, ?, ?, NULL, 0, ?)`,
      ownerUserId,
      entityType,
      entityLocalId,
      row.server_id ? "update" : "create",
      getNowIsoString()
    );
  });

  notifySyncStatusChanged();
  scheduleSync({ immediate: true, manual: true, bypassBackoff: true });
}

export function discardUnsyncedCatalogFailure(
  entityType: RecoverableCatalogEntityType,
  entityLocalId: string
) {
  const db = getDatabase();
  const ownerUserId = requireOwner();
  requireOwnedFailure(db, ownerUserId, entityType, entityLocalId);
  const table = CATALOG_TABLES[entityType];
  const row = db.getFirstSync<{ server_id: string | null }>(
    `SELECT server_id FROM ${table} WHERE id = ? LIMIT 1`,
    entityLocalId
  );

  if (row?.server_id) {
    throw new Error(
      "Este registro ya tuvo identidad remota y debe desactivarse por un administrador."
    );
  }
  if (
    row &&
    entityType === "ingredientes_activos" &&
    db.getFirstSync<{ id: string }>(
      `SELECT id FROM marcas_producto
       WHERE ingrediente_activo_id = ?
         AND sync_status IN ('pending', 'error')
       LIMIT 1`,
      entityLocalId
    )
  ) {
    throw new Error(
      "No se puede descartar: una marca pendiente depende de este ingrediente."
    );
  }

  runInSafeTransactionSync(db, () => {
    db.runSync(
      `DELETE FROM sync_outbox
       WHERE owner_user_id = ? AND entity_type = ? AND entity_local_id = ?`,
      ownerUserId,
      entityType,
      entityLocalId
    );
    db.runSync(
      `DELETE FROM sync_failures
       WHERE owner_user_id = ? AND entity_type = ? AND entity_local_id = ?`,
      ownerUserId,
      entityType,
      entityLocalId
    );
    db.runSync(`DELETE FROM ${table} WHERE id = ? AND server_id IS NULL`, entityLocalId);
  });

  notifySyncStatusChanged();
}

function requireOwner() {
  const ownerUserId = getCatalogSessionUserId(getDatabase());
  if (!ownerUserId) {
    throw new Error("No hay una sesion autenticada para recuperar el registro.");
  }
  return ownerUserId;
}

function requireOwnedFailure(
  db: ReturnType<typeof getDatabase>,
  ownerUserId: string,
  entityType: RecoverableCatalogEntityType,
  entityLocalId: string
) {
  const failure = db.getFirstSync<{ id: number }>(
    `SELECT id FROM sync_failures
     WHERE owner_user_id = ? AND entity_type = ? AND entity_local_id = ?
     LIMIT 1`,
    ownerUserId,
    entityType,
    entityLocalId
  );
  if (!failure) {
    throw new Error("El fallo no pertenece a la sesion activa o ya fue recuperado.");
  }
}
