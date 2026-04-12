import { getDatabase } from "./connection";

export function getCatalogsDownloadedAt() {
  const db = getDatabase();
  const result = db.getFirstSync<{ value: string }>(
    `SELECT value
     FROM app_meta
     WHERE key = ?
     LIMIT 1`,
    "catalogs_downloaded_at"
  );

  return result?.value ?? null;
}

export function areCatalogsReady() {
  return getCatalogsDownloadedAt() !== null;
}
