import { getDatabase } from "../../../shared/database/connection";
import type { ClimateDistrictCode, DistrictClimate } from "../types/clima.types";

type ClimateCacheRow = { payload_json: string; fetched_at: string; expires_at: string };
const SELECTED_DISTRICT_KEY = "clima_distrito_seleccionado";

export const climaCacheRepository = {
  get(districtCode: ClimateDistrictCode) {
    const row = getDatabase().getFirstSync<ClimateCacheRow>(
      `SELECT payload_json, fetched_at, expires_at
       FROM clima_distrito_cache
       WHERE distrito_codigo = ?
       LIMIT 1`,
      districtCode
    );
    if (!row) return null;
    try {
      return {
        climate: JSON.parse(row.payload_json) as DistrictClimate,
        fetchedAt: row.fetched_at,
        expiresAt: row.expires_at
      };
    } catch {
      return null;
    }
  },

  save(climate: DistrictClimate) {
    getDatabase().runSync(
      `INSERT INTO clima_distrito_cache (
        distrito_codigo, payload_json, fetched_at, expires_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(distrito_codigo) DO UPDATE SET
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at`,
      climate.district.code,
      JSON.stringify(climate),
      climate.source.fetchedAt,
      climate.source.expiresAt,
      new Date().toISOString()
    );
  },

  getSelectedDistrictCode() {
    const row = getDatabase().getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
      SELECTED_DISTRICT_KEY
    );
    return row?.value ?? null;
  },

  saveSelectedDistrictCode(districtCode: ClimateDistrictCode) {
    getDatabase().runSync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
      SELECTED_DISTRICT_KEY,
      districtCode
    );
  }
};
