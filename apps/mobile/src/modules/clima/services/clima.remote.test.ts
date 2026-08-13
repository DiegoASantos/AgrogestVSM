import { describe, expect, it, vi } from "vitest";

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("../../../shared/services", () => ({ apiRequest }));

import { climaRemote } from "./clima.remote";

describe("climaRemote.getWeatherLinkStations", () => {
  it("maps the API station field names to the mobile weather station contract", async () => {
    apiRequest.mockResolvedValue([
      {
        id: "station-1",
        name: "Davis Norte",
        codigo: "weatherlink:1",
        tipo: "ESTACION",
        latitude: null,
        longitude: null,
        status: "OPERATIVA",
        variables: [],
        lastCommunicationAt: null,
        isActive: true,
        source: "WeatherLink Davis",
        sourceCode: "weatherlink",
        syncStatus: "COMPLETADA",
        lastCompleteDay: "2026-08-11",
        syncDetail: null,
        current: []
      }
    ]);

    const stations = await climaRemote.getWeatherLinkStations();

    expect(stations[0]).toMatchObject({ code: "weatherlink:1", type: "ESTACION" });
    expect(apiRequest).toHaveBeenCalledWith("/clima/estaciones", { timeoutMs: 10_000 });
  });
});
