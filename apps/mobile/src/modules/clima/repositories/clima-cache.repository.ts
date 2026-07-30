import { getDatabase } from "../../../shared/database/connection";
import type { ParcelaClimate } from "../types/clima.types";

type ClimateCacheRow = {
  payload_json: string;
  fetched_at: string;
  expires_at: string;
};

export const climaCacheRepository = {
  get(parcelaId: string) {
    const row = getDatabase().getFirstSync<ClimateCacheRow>(
      `SELECT payload_json, fetched_at, expires_at
       FROM clima_parcela_cache
       WHERE parcela_id = ?
       LIMIT 1`,
      parcelaId
    );
    if (!row) return null;

    try {
      return {
        climate: JSON.parse(row.payload_json) as ParcelaClimate,
        fetchedAt: row.fetched_at,
        expiresAt: row.expires_at
      };
    } catch {
      return null;
    }
  },

  save(climate: ParcelaClimate) {
    getDatabase().runSync(
      `INSERT INTO clima_parcela_cache (
        parcela_id, payload_json, fetched_at, expires_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(parcela_id) DO UPDATE SET
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at`,
      climate.parcelaId,
      JSON.stringify(climate),
      climate.source.fetchedAt,
      climate.source.expiresAt,
      new Date().toISOString()
    );
  }
};
