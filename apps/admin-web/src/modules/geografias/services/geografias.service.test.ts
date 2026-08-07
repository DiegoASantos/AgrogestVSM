import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geografiasService } from "./geografias.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([]))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }

describe("geografiasService", () => {
  it("getDepartamentos calls /geografias/departamentos", async () => {
    await geografiasService.getDepartamentos(session);
    expect(fetchUrl()).toContain("/geografias/departamentos");
  });

  it("getProvincias calls /geografias/departamentos/:id/provincias", async () => {
    await geografiasService.getProvincias(session, "1");
    expect(fetchUrl()).toContain("/geografias/departamentos/1/provincias");
  });

  it("getDistritos calls /geografias/distritos", async () => {
    await geografiasService.getDistritos(session);
    expect(fetchUrl()).toContain("/geografias/distritos");
  });
});
