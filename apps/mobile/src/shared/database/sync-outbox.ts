import { type SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./connection";
import type { SyncEntityType } from "../sync/sync-entities";
import { requestSync } from "../sync/sync-requests";

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
};

export function insertSyncOutboxEntry(
  db: SQLiteDatabase,
  entry: SyncOutboxEntry
) {
  const existingEntries = db.getAllSync<Pick<SyncOutboxRow, "id" | "operation">>(
    `SELECT id, operation
     FROM sync_outbox
     WHERE entity_type = ? AND entity_local_id = ?
     ORDER BY id ASC`,
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
         WHERE entity_type = ? AND entity_local_id = ?`,
        entry.entityType,
        entry.entityLocalId
      );
    }

    if (!entry.payload) {
      return;
    }
  }

  db.runSync(
    `INSERT INTO sync_outbox (entity_type, entity_local_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    entry.entityType,
    entry.entityLocalId,
    entry.operation,
    entry.payload ?? null,
    entry.createdAt
  );

  requestSync();
}

export function getPendingOutboxEntries(limit = 100): SyncOutboxItem[] {
  const db = getDatabase();
  const rows = db.getAllSync<SyncOutboxRow>(
    `SELECT id, entity_type, entity_local_id, operation, payload, retry_count, created_at
     FROM sync_outbox
     ORDER BY id ASC
     LIMIT ?`,
    limit
  );

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type as SyncEntityType,
    entityLocalId: row.entity_local_id,
    operation: row.operation,
    payload: row.payload,
    retryCount: row.retry_count,
    createdAt: row.created_at
  }));
}

export function deleteOutboxEntry(id: number) {
  getDatabase().runSync(
    `DELETE FROM sync_outbox
     WHERE id = ?`,
    id
  );
}

export function incrementOutboxRetryCount(id: number) {
  getDatabase().runSync(
    `UPDATE sync_outbox SET retry_count = retry_count + 1 WHERE id = ?`,
    id
  );
}
