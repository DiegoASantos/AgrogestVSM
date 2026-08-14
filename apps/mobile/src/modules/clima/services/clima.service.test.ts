import { beforeEach, describe, expect, it, vi } from "vitest";

const remote = vi.hoisted(() => ({
  getWeatherLinkStations: vi.fn(),
  getWeatherLinkHistory: vi.fn()
}));
const stationCache = vi.hoisted(() => ({
  getAll: vi.fn(),
  get: vi.fn(),
  saveAll: vi.fn(),
  saveHistory: vi.fn()
}));

vi.mock("../repositories/clima-cache.repository", () => ({
  climaCacheRepository: {}
}));
vi.mock("../repositories/weatherlink-station-cache.repository", () => ({
  weatherLinkStationCacheRepository: stationCache
}));
vi.mock("./clima.remote", () => ({ climaRemote: remote }));

import { climaService } from "./clima.service";

const davisStation = {
  id: "station-1",
  name: "Davis Norte",
  code: "weatherlink:1",
  type: "ESTACION",
  latitude: null,
  longitude: null,
  status: "OPERATIVA",
  variables: ["temperature"],
  lastCommunicationAt: null,
  isActive: true,
  source: "WeatherLink Davis",
  sourceCode: "weatherlink",
  syncStatus: "COMPLETADA",
  lastCompleteDay: "2026-08-11",
  lastAttemptAt: "2026-08-12T08:00:00.000Z",
  syncDetail: null,
  current: []
};

describe("climaService.getWeatherLinkStations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stationCache.getAll.mockReturnValue([]);
  });

  it("loads and caches only active WeatherLink stations while online", async () => {
    remote.getWeatherLinkStations.mockResolvedValue([
      davisStation,
      { ...davisStation, id: "inactive", isActive: false },
      { ...davisStation, id: "other-source", sourceCode: "open_meteo" }
    ]);

    const result = await climaService.getWeatherLinkStations(true);

    expect(result).toEqual({ stations: [davisStation], isCached: false, isStale: false });
    expect(stationCache.saveAll).toHaveBeenCalledWith([davisStation]);
  });

  it("uses persisted Davis observations after an online request fails", async () => {
    remote.getWeatherLinkStations.mockRejectedValue(new Error("network"));
    stationCache.getAll.mockReturnValue([
      {
        station: davisStation,
        fetchedAt: "2026-08-10T08:00:00.000Z",
        expiresAt: "2000-01-01T00:00:00.000Z"
      }
    ]);

    const result = await climaService.getWeatherLinkStations(true);

    expect(result).toEqual({ stations: [davisStation], isCached: true, isStale: true });
  });

  it("reports when offline data does not exist", async () => {
    await expect(climaService.getWeatherLinkStations(false)).rejects.toThrow(
      "No hay datos guardados de estaciones Davis."
    );
  });
});

describe("climaService.getWeatherLinkHistory", () => {
  const history = {
    station: davisStation,
    range: { desde: "2026-08-13", hasta: "2026-08-13", timeZone: "America/Lima" },
    fetchedAt: "2026-08-14T10:00:00.000Z",
    cache: { hit: false, expiresAt: "2026-08-14T10:10:00.000Z" },
    rows: [],
    daily: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    stationCache.get.mockReturnValue(null);
  });

  it("stores a successful direct query without using outbox", async () => {
    remote.getWeatherLinkHistory.mockResolvedValue(history);

    const result = await climaService.getWeatherLinkHistory(
      davisStation,
      "2026-08-13",
      "2026-08-13",
      true
    );

    expect(result.requestedRangeMatches).toBe(true);
    expect(stationCache.saveHistory).toHaveBeenCalledWith(davisStation, history);
  });

  it("returns the last cached range offline and reports a mismatch", async () => {
    stationCache.get.mockReturnValue({
      station: davisStation,
      history,
      fetchedAt: history.fetchedAt,
      expiresAt: "2000-01-01T00:00:00.000Z"
    });

    const result = await climaService.getWeatherLinkHistory(
      davisStation,
      "2026-08-12",
      "2026-08-12",
      false
    );

    expect(result.isCached).toBe(true);
    expect(result.isStale).toBe(true);
    expect(result.requestedRangeMatches).toBe(false);
  });
});
