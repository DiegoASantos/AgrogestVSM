import { getDatabase } from "../../../shared/database/connection";
import type { WeatherLinkHistory, WeatherLinkStation } from "../types/clima.types";

const SELECTED_STATION_KEY = "clima_estacion_weatherlink_seleccionada";
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

type CachedStationRow = {
  estacion_id: string;
  payload_json: string;
  fetched_at: string;
  expires_at: string;
};

type CachedStationPayload = {
  station: WeatherLinkStation;
  history?: WeatherLinkHistory;
};

export const weatherLinkStationCacheRepository = {
  getAll() {
    const rows = getDatabase().getAllSync<CachedStationRow>(
      `SELECT estacion_id, payload_json, fetched_at, expires_at
       FROM clima_estacion_cache
       ORDER BY updated_at DESC`
    );

    return rows.flatMap((row) => {
      try {
        return [
          {
            station: parsePayload(row.payload_json).station,
            history: parsePayload(row.payload_json).history,
            fetchedAt: row.fetched_at,
            expiresAt: row.expires_at
          }
        ];
      } catch {
        return [];
      }
    });
  },

  saveAll(stations: WeatherLinkStation[], fetchedAt = new Date().toISOString()) {
    const expiresAt = new Date(
      new Date(fetchedAt).getTime() + CACHE_TTL_MS
    ).toISOString();
    const database = getDatabase();

    for (const station of stations) {
      const existing = this.get(station.id);
      database.runSync(
        `INSERT INTO clima_estacion_cache (
          estacion_id, payload_json, fetched_at, expires_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(estacion_id) DO UPDATE SET
          payload_json = excluded.payload_json,
          fetched_at = excluded.fetched_at,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at`,
        station.id,
        JSON.stringify({ station, history: existing?.history }),
        fetchedAt,
        expiresAt,
        new Date().toISOString()
      );
    }
  },

  get(stationId: string) {
    const row = getDatabase().getFirstSync<CachedStationRow>(
      `SELECT estacion_id, payload_json, fetched_at, expires_at
       FROM clima_estacion_cache WHERE estacion_id = ? LIMIT 1`,
      stationId
    );
    if (!row) return null;
    try {
      return {
        ...parsePayload(row.payload_json),
        fetchedAt: row.fetched_at,
        expiresAt: row.expires_at
      };
    } catch {
      return null;
    }
  },

  saveHistory(
    station: WeatherLinkStation,
    history: WeatherLinkHistory,
    fetchedAt = new Date().toISOString()
  ) {
    const expiresAt = new Date(
      new Date(fetchedAt).getTime() + CACHE_TTL_MS
    ).toISOString();
    getDatabase().runSync(
      `INSERT INTO clima_estacion_cache (
        estacion_id, payload_json, fetched_at, expires_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(estacion_id) DO UPDATE SET
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at`,
      station.id,
      JSON.stringify({ station, history }),
      fetchedAt,
      expiresAt,
      new Date().toISOString()
    );
  },

  getSelectedStationId() {
    const row = getDatabase().getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
      SELECTED_STATION_KEY
    );
    return row?.value ?? null;
  },

  saveSelectedStationId(stationId: string) {
    getDatabase().runSync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
      SELECTED_STATION_KEY,
      stationId
    );
  }
};

function parsePayload(value: string): CachedStationPayload {
  const parsed = JSON.parse(value) as CachedStationPayload | WeatherLinkStation;
  if ("station" in parsed) return parsed;
  return { station: parsed };
}
