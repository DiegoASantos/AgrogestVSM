import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardService } from "./dashboard.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse({}))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }

describe("dashboardService", () => {
  it("getResumen calls /dashboard/resumen without year param", async () => {
    await dashboardService.getResumen(session);
    expect(fetchUrl()).toContain("/dashboard/resumen");
  });

  it("getResumen calls /dashboard/resumen with year param", async () => {
    await dashboardService.getResumen(session, 2026);
    expect(fetchUrl()).toContain("year=2026");
  });
});
