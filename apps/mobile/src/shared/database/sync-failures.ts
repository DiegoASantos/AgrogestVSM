import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./connection";
import type { SyncOutboxItem, SyncOutboxOperation } from "./sync-outbox";
import { getNowIsoString } from "./sqlite-utils";
import {
  SYNC_ENTITY_TABLES,
  type SyncEntityType
} from "../sync/sync-entities";
import { notifySyncStatusChanged } from "../sync/sync-events";

export type SyncFailureKind = "transient" | "permanent";

export type SyncFailure = {
  id: number;
  entityType: SyncEntityType;
  entityLocalId: string;
  operation: SyncOutboxOperation;
  payload: string | null;
  retryCount: number;
  errorKind: SyncFailureKind;
  errorMessage: string | null;
  outboxCreatedAt: string;
  lastAttemptAt: string;
  failedAt: string;
};

type SyncFailureRow = {
  id: number;
  entity_type: SyncEntityType;
  entity_local_id: string;
  operation: SyncOutboxOperation;
  payload: string | null;
  retry_count: number;
  error_kind: SyncFailureKind;
  error_message: string | null;
  outbox_created_at: string;
  last_attempt_at: string;
  failed_at: string;
};

export function storeSyncFailure(
  db: SQLiteDatabase,
  entry: SyncOutboxItem,
  errorKind: SyncFailureKind,
  errorMessage: string,
  attemptedAt = getNowIsoString()
) {
  db.runSync(
    `INSERT OR REPLACE INTO sync_failures (
       id,
       entity_type,
       entity_local_id,
       operation,
       payload,
       retry_count,
       error_kind,
       error_message,
       outbox_created_at,
       last_attempt_at,
       failed_at
     )
     VALUES (
       (SELECT id FROM sync_failures WHERE entity_type = ? AND entity_local_id = ?),
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     )`,
    entry.entityType,
    entry.entityLocalId,
    entry.entityType,
    entry.entityLocalId,
    entry.operation,
    entry.payload,
    entry.retryCount + 1,
    errorKind,
    errorMessage,
    entry.createdAt,
    attemptedAt,
    attemptedAt
  );
}

export function deleteSyncFailureForEntity(
  db: SQLiteDatabase,
  entityType: SyncEntityType,
  entityLocalId: string,
  kind?: SyncFailureKind
) {
  db.runSync(
    `DELETE FROM sync_failures
     WHERE entity_type = ? AND entity_local_id = ?
       ${kind ? "AND error_kind = ?" : ""}`,
    entityType,
    entityLocalId,
    ...(kind ? [kind] : [])
  );
}

export function getSyncFailures(): SyncFailure[] {
  return getDatabase()
    .getAllSync<SyncFailureRow>(
      `SELECT
         id,
         entity_type,
         entity_local_id,
         operation,
         payload,
         retry_count,
         error_kind,
         error_message,
         outbox_created_at,
         last_attempt_at,
         failed_at
       FROM sync_failures
       ORDER BY failed_at DESC, id DESC`
    )
    .map(mapFailureRow);
}

export function retryTransientSyncFailures() {
  const db = getDatabase();
  const failures = db.getAllSync<SyncFailureRow>(
    `SELECT
       id,
       entity_type,
       entity_local_id,
       operation,
       payload,
       retry_count,
       error_kind,
       error_message,
       outbox_created_at,
       last_attempt_at,
       failed_at
     FROM sync_failures
     WHERE error_kind = 'transient'
     ORDER BY CASE WHEN entity_type = 'visitas_campo' THEN 0 ELSE 1 END,
              failed_at ASC,
              id ASC`
  );

  db.withTransactionSync(() => {
    for (const failure of failures) {
      const existing = db.getFirstSync<{ id: number }>(
        `SELECT id FROM sync_outbox
         WHERE entity_type = ? AND entity_local_id = ?
         LIMIT 1`,
        failure.entity_type,
        failure.entity_local_id
      );

      if (!existing) {
        db.runSync(
          `INSERT INTO sync_outbox (
             entity_type, entity_local_id, operation, payload, retry_count, created_at
           ) VALUES (?, ?, ?, ?, 0, ?)`,
          failure.entity_type,
          failure.entity_local_id,
          failure.operation,
          failure.payload,
          failure.outbox_created_at
        );
      }

      markEntityPending(db, failure.entity_type, failure.entity_local_id);
      db.runSync(`DELETE FROM sync_failures WHERE id = ?`, failure.id);
    }
  });

  if (failures.length > 0) {
    notifySyncStatusChanged();
  }

  return failures.length;
}

function markEntityPending(
  db: SQLiteDatabase,
  entityType: SyncEntityType,
  entityLocalId: string
) {
  const table = SYNC_ENTITY_TABLES[entityType];
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);

  if (!columns.some((column) => column.name === "sync_status")) {
    return;
  }

  const hasErrorMessage = columns.some(
    (column) => column.name === "sync_error_message"
  );
  db.runSync(
    `UPDATE ${table}
     SET sync_status = 'pending'
       ${hasErrorMessage ? ", sync_error_message = NULL" : ""}
     WHERE local_id = ?`,
    entityLocalId
  );
}

function mapFailureRow(row: SyncFailureRow): SyncFailure {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityLocalId: row.entity_local_id,
    operation: row.operation,
    payload: row.payload,
    retryCount: row.retry_count,
    errorKind: row.error_kind,
    errorMessage: row.error_message,
    outboxCreatedAt: row.outbox_created_at,
    lastAttemptAt: row.last_attempt_at,
    failedAt: row.failed_at
  };
}
