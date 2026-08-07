import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sectoresService } from "../../sectores/services/sectores.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, meta: { total: 1 }, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([]))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }
function fetchMethod() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? (c[c.length - 1] as Record<string, unknown>[])[1]?.method : ""; }

describe("sectoresService", () => {
  describe("#getAll", () => {
    it("should build query with distritoId filter", async () => {
      await sectoresService.getAll(session, { distritoId: "1", isActive: true });
      expect(fetchUrl()).toContain("distrito_id=1");
      expect(fetchUrl()).toContain("activo=true");
    });

    it("should fetch without filters", async () => {
      await sectoresService.getAll(session);
      expect(fetchUrl()).toContain("/sectores");
    });
  });

  describe("#getById", () => {
    it("should GET /sectores/:id", async () => {
      await sectoresService.getById(session, "5");
      expect(fetchUrl()).toContain("/sectores/5");
    });
  });

  describe("#getByProductor", () => {
    it("should GET /productores/:id/sectores", async () => {
      await sectoresService.getByProductor(session, "prod1");
      expect(fetchUrl()).toContain("/productores/prod1/sectores");
    });
  });

  describe("#create", () => {
    it("should POST /sectores", async () => {
      await sectoresService.create(session, { name: "S" } as never);
      expect(fetchMethod()).toBe("POST");
    });
  });

  describe("#update", () => {
    it("should PATCH /sectores/:id", async () => {
      await sectoresService.update(session, "2", { name: "X" } as never);
      expect(fetchMethod()).toBe("PATCH");
    });
  });

  describe("#remove", () => {
    it("should DELETE /sectores/:id", async () => {
      await sectoresService.remove(session, "1");
      expect(fetchMethod()).toBe("DELETE");
    });
  });
});
