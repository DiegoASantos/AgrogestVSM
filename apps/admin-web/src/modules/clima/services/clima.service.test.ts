import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { climaService } from "./clima.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([]))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }

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
});
