import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDashboardPeriodQuery, dashboardService } from "./dashboard.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ success: true, data, timestamp: "" }))
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse({})));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function fetchUrl() {
  const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  return c.length ? String((c[c.length - 1] as string[])[0]) : "";
}

describe("dashboardService", () => {
  it("getResumen calls /dashboard/resumen with the selected period", async () => {
    await dashboardService.getResumen(session, { year: 2026, month: 9, day: 5 });
    expect(fetchUrl()).toContain("year=2026");
    expect(fetchUrl()).toContain("month=9");
    expect(fetchUrl()).toContain("day=5");
  });

  it("omits optional month and day from the dashboard period query", () => {
    expect(buildDashboardPeriodQuery({ year: 2026, month: null, day: null })).toBe(
      "year=2026"
    );
  });

  it("requests visits per agronomist with an inclusive date range", async () => {
    await dashboardService.getVisitasPorAgronomo(session, {
      startDate: "2026-08-01",
      endDate: "2026-08-24"
    });

    expect(fetchUrl()).toContain("/dashboard/visitas-por-agronomo?");
    expect(fetchUrl()).toContain("fecha_desde=2026-08-01");
    expect(fetchUrl()).toContain("fecha_hasta=2026-08-24");
  });

  it("requests parcels per stage with its date range", async () => {
    await dashboardService.getParcelasPorEtapa(session, {
      startDate: "2026-08-01",
      endDate: "2026-08-24"
    });

    expect(fetchUrl()).toContain("/dashboard/parcelas-por-etapa?");
    expect(fetchUrl()).not.toContain("etapa_fenologica_id");
  });
});
