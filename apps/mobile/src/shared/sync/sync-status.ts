import { getCatalogsDownloadedAt } from "../database/catalog-status";
import { getDatabase } from "../database/connection";
import { SYNC_ENTITY_TYPES } from "./sync-entities";

type SyncCountsResult = {
  pendingCount: number;
  errorCount: number;
};

export function getSyncCounts(): SyncCountsResult {
  const db = getDatabase();

  let pendingCount = 0;
  let errorCount = 0;

  for (const table of SYNC_ENTITY_TYPES) {
    const row = db.getFirstSync<{ pending: number | null; error: number | null }>(
      `SELECT
        SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) as error
       FROM ${table}`
    );

    if (row) {
      pendingCount += row.pending ?? 0;
      errorCount += row.error ?? 0;
    }
  }

  return { pendingCount, errorCount };
}

export function getLastSyncTime(): string | null {
  const db = getDatabase();
  const result = db.getFirstSync<{ value: string }>(
    `SELECT value
     FROM app_meta
     WHERE key = ?
     LIMIT 1`,
    "last_sync_completed_at"
  );

  return result?.value ?? getCatalogsDownloadedAt();
}

export function setLastSyncTime(value: string) {
  getDatabase().runSync(
    `INSERT OR REPLACE INTO app_meta (key, value)
     VALUES (?, ?)`,
    "last_sync_completed_at",
    value
  );
}
