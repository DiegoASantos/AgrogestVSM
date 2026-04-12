import { getDatabase } from "../../database/connection";

let apiToken: string | null = null;

export function setApiToken(token: string | null) {
  apiToken = token;
  persistToken(token);
}

export function clearApiToken() {
  apiToken = null;
  persistToken(null);
}

export function getApiToken() {
  return apiToken;
}

export function hydrateApiToken(): string | null {
  try {
    const db = getDatabase();
    const row = db.getFirstSync<{ value: string | null }>(
      `SELECT value FROM app_meta WHERE key = ? LIMIT 1`,
      "auth_access_token"
    );

    if (row?.value) {
      apiToken = row.value;
      return row.value;
    }
  } catch {
    // DB may not be initialized yet
  }

  return null;
}

function persistToken(token: string | null) {
  try {
    const db = getDatabase();

    if (token) {
      db.runSync(
        `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
        "auth_access_token",
        token
      );
    } else {
      db.runSync(
        `DELETE FROM app_meta WHERE key = ?`,
        "auth_access_token"
      );
    }
  } catch {
    // Persisting the token should not break the active in-memory session.
  }
}
