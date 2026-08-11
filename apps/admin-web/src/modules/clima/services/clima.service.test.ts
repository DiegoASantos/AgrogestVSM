import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { climaService } from "./clima.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ success: true, data, timestamp: "" }))
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([])));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function fetchUrl() {
  const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  return c.length ? String((c[c.length - 1] as string[])[0]) : "";
}

function fetchOptions() {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  return calls.at(-1)?.[1] as RequestInit | undefined;
}

describe("climaService", () => {
  it("getSummary calls /clima/resumen", async () => {
    await climaService.getSummary(session);
    expect(fetchUrl()).toContain("/clima/resumen");
  });

  it("getMap calls /clima/mapa", async () => {
    await climaService.getMap(session);
    expect(fetchUrl()).toContain("/clima/mapa");
  });

  it("getForecast calls /clima/pronostico with optional pointId", async () => {
    await climaService.getForecast(session, "p1");
    expect(fetchUrl()).toContain("punto_id=p1");

    await climaService.getForecast(session);
    expect(fetchUrl()).toContain("/clima/pronostico");
  });

  it("getHistory calls /clima/historico", async () => {
    await climaService.getHistory(session, "p1");
    expect(fetchUrl()).toContain("/clima/historico?punto_id=p1");
  });

  it("gets WeatherLink station history and status", async () => {
    await climaService.getStationHistory(session, "station/1");
    expect(fetchUrl()).toContain("/clima/historico?estacion_id=station%2F1");

    await climaService.getWeatherLinkStatus(session);
    expect(fetchUrl()).toContain("/clima/fuentes/weatherlink/estado");
  });

  it("starts sync and serializes station activation once", async () => {
    await climaService.forceWeatherLinkSync(session);
    expect(fetchOptions()).toMatchObject({ method: "POST" });

    await climaService.updateWeatherLinkStation(session, "station-1", false);
    expect(fetchUrl()).toContain("/clima/estaciones/station-1/activo");
    expect(fetchOptions()).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ isActive: false })
    });
  });

  it("getPoints calls /clima/puntos", async () => {
    await climaService.getPoints(session);
    expect(fetchUrl()).toContain("/clima/puntos");
  });

  it("getStations calls /clima/estaciones", async () => {
    await climaService.getStations(session);
    expect(fetchUrl()).toContain("/clima/estaciones");
  });

  it("getAlerts calls /clima/alertas", async () => {
    await climaService.getAlerts(session);
    expect(fetchUrl()).toContain("/clima/alertas");
  });

  it("getSources calls /clima/fuentes", async () => {
    await climaService.getSources(session);
    expect(fetchUrl()).toContain("/clima/fuentes");
  });

  it("calls reservoir list and filtered history endpoints", async () => {
    await climaService.getReservorios(session);
    expect(fetchUrl()).toContain("/clima/reservorios");

    await climaService.getReservorioHistory(session, "reservoir/id", {
      variable: "volumen_mmc",
      desde: "2026-08-01T00:00:00-05:00"
    });
    expect(fetchUrl()).toContain("/clima/reservorios/reservoir%2Fid/historico?");
    expect(fetchUrl()).toContain("variable=volumen_mmc");
    expect(fetchUrl()).toContain("desde=2026-08-01T00%3A00%3A00-05%3A00");
  });

  it("sends create and update bodies exactly once as JSON", async () => {
    const createBody = {
      variable: "volumen_mmc",
      valor: 500,
      unidad: "MMC",
      tipo: "OBSERVADO",
      dato_at: "2026-08-11T08:00:00-05:00"
    };

    await climaService.createReservorioReading(session, "r1", createBody);
    expect(fetchOptions()).toMatchObject({
      method: "POST",
      body: JSON.stringify(createBody)
    });

    await climaService.updateReservorioReading(session, "r1", "l1", {
      valor: 450
    });
    expect(fetchOptions()).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ valor: 450 })
    });
  });

  it("deletes a reading from its reservoir", async () => {
    await climaService.deleteReservorioReading(session, "r1", "l1");

    expect(fetchUrl()).toContain("/clima/reservorios/r1/lecturas/l1");
    expect(fetchOptions()).toMatchObject({ method: "DELETE" });
  });
});
