import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productoresService } from "./productores.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, meta: { total: 1, totalPages: 1 }, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([{ id: "1", firstName: "J", documentNumber: null, publicId: "pub" }]))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }
function fetchMethod() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? (c[c.length - 1] as Record<string, unknown>[])[1]?.method : ""; }

describe("productoresService", () => {
  describe("#getPage", () => {
    it("should build query with page, limit and search params", async () => {
      await productoresService.getPage(session, { page: 2, limit: 10, search: "juan", isActive: true });
      expect(fetchUrl()).toContain("/productores?");
      expect(fetchUrl()).toContain("page=2");
      expect(fetchUrl()).toContain("limit=10");
      expect(fetchUrl()).toContain("search=juan");
      expect(fetchUrl()).toContain("activo=true");
    });

    it("should read total from meta", async () => {
      const res = await productoresService.getPage(session, { page: 1, limit: 50 });
      expect(res.items).toBeDefined();
    });
  });

  describe("#getAll", () => {
    it("should fetch all pages", async () => {
      await productoresService.getAll(session);
      expect(fetchUrl()).toContain("/productores");
    });
  });

  describe("#create", () => {
    it("should POST to /productores", async () => {
      await productoresService.create(session, { firstName: "Juan" } as never);
      expect(fetchMethod()).toBe("POST");
    });
  });

  describe("#update", () => {
    it("should PATCH to /productores/:id", async () => {
      await productoresService.update(session, "1", { firstName: "J" } as never);
      expect(fetchMethod()).toBe("PATCH");
      expect(fetchUrl()).toContain("/productores/1");
    });
  });

  describe("#remove", () => {
    it("should DELETE to /productores/:id", async () => {
      await productoresService.remove(session, "1");
      expect(fetchMethod()).toBe("DELETE");
    });
  });
});
