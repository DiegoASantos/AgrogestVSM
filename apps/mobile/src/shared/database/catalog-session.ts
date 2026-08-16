import type { SQLiteDatabase } from "expo-sqlite";

const CATALOG_SESSION_USER_KEY = "catalog_session_user_id";

export function getCatalogSessionUserId(db: SQLiteDatabase): string | null {
  return (
    db.getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
      CATALOG_SESSION_USER_KEY
    )?.value ?? null
  );
}

export function setCatalogSessionUserId(
  db: SQLiteDatabase,
  userId: string | null
): void {
  if (userId === null) {
    db.runSync("DELETE FROM app_meta WHERE key = ?", CATALOG_SESSION_USER_KEY);
    return;
  }

  const previousUserId = getCatalogSessionUserId(db);

  if (previousUserId !== userId) {
    db.runSync("DELETE FROM app_meta WHERE key = ?", "catalogs_downloaded_at");
    db.runSync("DELETE FROM app_meta WHERE key = ?", "last_sync_completed_at");
  }

  db.runSync(
    "UPDATE sync_outbox SET owner_user_id = ? WHERE owner_user_id IS NULL",
    userId
  );
  db.runSync(
    "UPDATE sync_failures SET owner_user_id = ? WHERE owner_user_id IS NULL",
    userId
  );

  db.runSync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    CATALOG_SESSION_USER_KEY,
    userId
  );
}
