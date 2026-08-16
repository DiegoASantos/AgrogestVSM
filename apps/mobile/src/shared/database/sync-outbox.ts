import { type SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./connection";
import type { SyncEntityType } from "../sync/sync-entities";
import { notifySyncStatusChanged } from "../sync/sync-events";
import { deleteSyncFailureForEntity } from "./sync-failures";
import { scheduleSync } from "../sync/sync-requests";
import { getCatalogSessionUserId } from "./catalog-session";

export type SyncOutboxOperation = "create" | "update" | "delete";

export type SyncOutboxEntry = {
  entityType: SyncEntityType;
  entityLocalId: string;
  operation: SyncOutboxOperation;
  payload?: string | null;
  createdAt: string;
};

type SyncOutboxRow = {
  id: number;
  owner_user_id: string | null;
  entity_type: string;
  entity_local_id: string;
  operation: SyncOutboxOperation;
  payload: string | null;
  retry_count: number;
  created_at: string;
};

export type SyncOutboxItem = {
  id: number;
  entityType: SyncEntityType;
  entityLocalId: string;
  operation: SyncOutboxOperation;
  payload: string | null;
  retryCount: number;
  createdAt: string;
  ownerUserId?: string | null;
};

export function insertSyncOutboxEntry(db: SQLiteDatabase, entry: SyncOutboxEntry) {
  const ownerUserId = requireSyncOwner(db);
  deleteSyncFailureForEntity(db, entry.entityType, entry.entityLocalId, "transient");
  const existingEntries = db.getAllSync<Pick<SyncOutboxRow, "id" | "operation">>(
    `SELECT id, operation
     FROM sync_outbox
     WHERE owner_user_id = ? AND entity_type = ? AND entity_local_id = ?
     ORDER BY id ASC`,
    ownerUserId,
    entry.entityType,
    entry.entityLocalId
  );

  if (entry.operation === "create") {
    if (existingEntries.length > 0) {
      return;
    }
  }

  if (entry.operation === "update") {
    if (existingEntries.length > 0) {
      return;
    }
  }

  if (entry.operation === "delete") {
    if (existingEntries.length > 0) {
      db.runSync(
        `DELETE FROM sync_outbox
         WHERE owner_user_id = ? AND entity_type = ? AND entity_local_id = ?`,
        ownerUserId,
        entry.entityType,
        entry.entityLocalId
      );
    }

    if (!entry.payload) {
      return;
    }
  }

  db.runSync(
    `INSERT INTO sync_outbox (
       owner_user_id, entity_type, entity_local_id, operation, payload, created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    ownerUserId,
    entry.entityType,
    entry.entityLocalId,
    entry.operation,
    entry.payload ?? null,
    entry.createdAt
  );

  scheduleSync();
  notifySyncStatusChanged();
}

export function getPendingOutboxEntries(limit = 100): SyncOutboxItem[] {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);

  if (!ownerUserId) {
    return [];
  }

  const rows = db.getAllSync<SyncOutboxRow>(
    `SELECT id, owner_user_id, entity_type, entity_local_id, operation, payload,
       retry_count, created_at
     FROM sync_outbox
     WHERE owner_user_id = ?
     ORDER BY CASE
       WHEN entity_type = 'productores' THEN 0
       WHEN entity_type = 'sectores' THEN 0
       WHEN entity_type = 'ingredientes_activos' THEN 0
       WHEN entity_type = 'fertilizantes' THEN 0
       WHEN entity_type = 'marcas_producto' THEN 1
       WHEN entity_type = 'subsectores' THEN 1
       WHEN entity_type = 'parcelas' THEN 2
       WHEN entity_type = 'visitas_campo' THEN 3
       ELSE 4
     END,
              id ASC
     LIMIT ?`,
    ownerUserId,
    limit
  );

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type as SyncEntityType,
    entityLocalId: row.entity_local_id,
    operation: row.operation,
    payload: row.payload,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    ownerUserId: row.owner_user_id
  }));
}

function requireSyncOwner(db: SQLiteDatabase): string {
  const ownerUserId = getCatalogSessionUserId(db);

  if (!ownerUserId) {
    throw new Error("No hay una sesion autenticada para registrar sincronizacion.");
  }

  return ownerUserId;
}

export function deleteOutboxEntry(id: number) {
  getDatabase().runSync(
    `DELETE FROM sync_outbox
     WHERE id = ?`,
    id
  );
  notifySyncStatusChanged();
}

export function incrementOutboxRetryCount(id: number) {
  getDatabase().runSync(
    `UPDATE sync_outbox SET retry_count = retry_count + 1 WHERE id = ?`,
    id
  );
  notifySyncStatusChanged();
}
