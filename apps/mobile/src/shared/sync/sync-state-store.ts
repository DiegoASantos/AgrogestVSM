import { getDatabase } from "../database/connection";
import { SyncManager, type SyncAttemptRecord, type SyncManagerState } from "./sync-manager";

const SYNC_STATE_ID = "default";

type SyncStateRow = {
  window_json: string;
  consecutive_failures: number;
  consecutive_successes: number;
  backoff_step: number;
  last_attempt_at: string | null;
  updated_at: string;
};

export class SQLiteSyncManagerStateStore {
  load(): SyncManagerState | null {
    const row = getDatabase().getFirstSync<SyncStateRow>(
      `SELECT
        window_json,
        consecutive_failures,
        consecutive_successes,
        backoff_step,
        last_attempt_at,
        updated_at
       FROM sync_state
       WHERE id = ?
       LIMIT 1`,
      SYNC_STATE_ID
    );

    if (!row) {
      return null;
    }

    return {
      window: parseWindow(row.window_json),
      consecutiveFailures: row.consecutive_failures,
      consecutiveSuccesses: row.consecutive_successes,
      backoffStep: row.backoff_step,
      lastAttemptAt: row.last_attempt_at,
      updatedAt: row.updated_at
    };
  }

  save(state: SyncManagerState) {
    getDatabase().runSync(
      `INSERT OR REPLACE INTO sync_state (
        id,
        window_json,
        consecutive_failures,
        consecutive_successes,
        backoff_step,
        last_attempt_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      SYNC_STATE_ID,
      JSON.stringify(state.window),
      state.consecutiveFailures,
      state.consecutiveSuccesses,
      state.backoffStep,
      state.lastAttemptAt,
      state.updatedAt
    );
  }
}

export function createDefaultSyncManager() {
  return new SyncManager(new SQLiteSyncManagerStateStore());
}

function parseWindow(value: string): SyncAttemptRecord[] {
  try {
    const parsed = JSON.parse(value) as SyncAttemptRecord[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (attempt) =>
        typeof attempt?.success === "boolean" &&
        typeof attempt.attemptedAt === "string"
    );
  } catch {
    return [];
  }
}
