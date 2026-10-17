import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { visitasComercialesService } from "./visitas-comerciales.service";

const session = { accessToken: "test-token", tokenType: "Bearer" };
const filters = { startDate: "2026-10-01", endDate: "2026-10-31", agronomistUserId: "7" };

describe("visitasComercialesService", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("passes commercial list filters with authentication", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200,
      text: async () => JSON.stringify({ success: true, data: [], meta: { total: 0 } }) });
    await visitasComercialesService.list(session, filters, 2);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/visitas-comerciales?page=2&limit=20");
    expect(String(url)).toContain("fecha_desde=2026-10-01");
    expect(String(url)).toContain("agronomo_usuario_id=7");
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("requests the general two-sheet Excel and individual PDF as binary downloads", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, headers: new Headers(),
      blob: async () => new Blob(["report"]) });
    await visitasComercialesService.downloadExcel(session, filters, "GENERAL");
    expect(String(fetchMock.mock.calls[0][0])).toContain("tipo=GENERAL");
    await visitasComercialesService.downloadPdf(session, "11111111-1111-4111-8111-111111111111");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/reporte-pdf");
  });
});
