import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subsectoresService } from "../../subsectores/services/subsectores.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, meta: { total: 1 }, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([]))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }
function fetchMethod() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? (c[c.length - 1] as Record<string, unknown>[])[1]?.method : ""; }

describe("subsectoresService", () => {
  describe("#getAll", () => {
    it("should build query with sectorId filter", async () => {
      await subsectoresService.getAll(session, { sectorId: "s1", isActive: false });
      expect(fetchUrl()).toContain("sector_id=s1");
      expect(fetchUrl()).toContain("activo=false");
    });
  });

  describe("#getById", () => {
    it("should GET /subsectores/:id", async () => {
      await subsectoresService.getById(session, "3");
      expect(fetchUrl()).toContain("/subsectores/3");
    });
  });

  describe("#create", () => {
    it("should POST /subsectores", async () => {
      await subsectoresService.create(session, { name: "S" } as never);
      expect(fetchMethod()).toBe("POST");
    });
  });

  describe("#update", () => {
    it("should PATCH /subsectores/:id", async () => {
      await subsectoresService.update(session, "2", { name: "X" } as never);
      expect(fetchMethod()).toBe("PATCH");
    });
  });

  describe("#remove", () => {
    it("should DELETE /subsectores/:id", async () => {
      await subsectoresService.remove(session, "1");
      expect(fetchMethod()).toBe("DELETE");
    });
  });
});
