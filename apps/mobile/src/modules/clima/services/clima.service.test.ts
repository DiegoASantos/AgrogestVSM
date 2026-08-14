import { beforeEach, describe, expect, it, vi } from "vitest";

const remote = vi.hoisted(() => ({ getWeatherLinkStations: vi.fn() }));
const stationCache = vi.hoisted(() => ({ getAll: vi.fn(), saveAll: vi.fn() }));

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
