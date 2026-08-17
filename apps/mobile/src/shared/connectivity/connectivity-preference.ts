import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "../database/connection";
import type { NetworkPreference } from "./connectivity-types";

const NETWORK_PREFERENCE_PREFIX = "network_preference:";

export function getNetworkPreference(
  userId: string | null,
  db: SQLiteDatabase = getDatabase()
): NetworkPreference {
  if (!userId) {
    return "automatic";
  }

  const row = db.getFirstSync<{ value: string }>(
    `SELECT value
     FROM app_meta
     WHERE key = ?
     LIMIT 1`,
    `${NETWORK_PREFERENCE_PREFIX}${userId}`
  );

  return row?.value === "offline" ? "offline" : "automatic";
}

export function saveNetworkPreference(
  userId: string,
  preference: NetworkPreference,
  db: SQLiteDatabase = getDatabase()
) {
  db.runSync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    `${NETWORK_PREFERENCE_PREFIX}${userId}`,
    preference
  );
}
