import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn()
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));

import { weatherLinkStationCacheRepository } from "./weatherlink-station-cache.repository";

const station = {
  id: "station-1",
  name: "Davis Norte",
  code: "weatherlink:1",
  type: "ESTACION",
  latitude: null,
  longitude: null,
  status: "OPERATIVA",
  variables: ["temperature"],
  lastCommunicationAt: "2026-08-12T08:00:00.000Z",
  isActive: true,
  source: "WeatherLink Davis",
  sourceCode: "weatherlink",
  syncStatus: "COMPLETADA",
  lastCompleteDay: "2026-08-11",
  syncDetail: null,
  current: []
};

describe("weatherLinkStationCacheRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.getFirstSync.mockReturnValue(null);
  });

  it("stores each selected WeatherLink station without creating outbox records", () => {
    weatherLinkStationCacheRepository.saveAll([station], "2026-08-12T08:00:00.000Z");

    expect(database.runSync).toHaveBeenCalledTimes(1);
    expect(database.runSync.mock.calls[0][0]).toContain(
      "INSERT INTO clima_estacion_cache"
    );
    expect(database.runSync.mock.calls[0][0]).not.toContain("sync_outbox");
    expect(database.runSync.mock.calls[0].slice(1, 3)).toEqual([
      "station-1",
      JSON.stringify(station)
    ]);
  });

  it("returns only cache rows with a valid payload", () => {
    database.getAllSync.mockReturnValue([
      {
        estacion_id: "station-1",
        payload_json: JSON.stringify(station),
        fetched_at: "2026-08-12T08:00:00.000Z",
        expires_at: "2026-08-13T08:00:00.000Z"
      },
      {
        estacion_id: "broken",
        payload_json: "{",
        fetched_at: "2026-08-12T08:00:00.000Z",
        expires_at: "2026-08-13T08:00:00.000Z"
      }
    ] as never);

    const cached = weatherLinkStationCacheRepository.getAll();

    expect(cached).toHaveLength(1);
    expect(cached[0]?.station.name).toBe("Davis Norte");
  });

  it("persists and restores the selected station id", () => {
    database.getFirstSync.mockReturnValue({ value: "station-1" });

    expect(weatherLinkStationCacheRepository.getSelectedStationId()).toBe("station-1");
    weatherLinkStationCacheRepository.saveSelectedStationId("station-1");

    expect(database.runSync.mock.calls[0][0]).toContain(
      "INSERT OR REPLACE INTO app_meta"
    );
  });
});
