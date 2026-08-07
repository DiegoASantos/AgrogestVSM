import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parcelasService } from "./parcelas.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, meta: { total: 1 }, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([]))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }
function fetchMethod() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? (c[c.length - 1] as Record<string, unknown>[])[1]?.method : ""; }

describe("parcelasService", () => {
  describe("#getAll", () => {
    it("should build query with filters", async () => {
      await parcelasService.getAll(session, { sectorId: "s1", subsectorId: "sub1", productorId: "p1", isActive: true });
      expect(fetchUrl()).toContain("sector_id=s1");
      expect(fetchUrl()).toContain("subsector_id=sub1");
      expect(fetchUrl()).toContain("productor_id=p1");
    });

    it("should fetch without filters", async () => {
      await parcelasService.getAll(session);
      expect(fetchUrl()).toContain("/parcelas");
    });
  });

  describe("#getById", () => {
    it("should GET /parcelas/:id", async () => {
      await parcelasService.getById(session, "5");
      expect(fetchUrl()).toContain("/parcelas/5");
    });
  });

  describe("#create", () => {
    it("should POST to /parcelas", async () => {
      await parcelasService.create(session, { code: "P-001" } as never);
      expect(fetchMethod()).toBe("POST");
    });
  });

  describe("#update", () => {
    it("should PATCH /parcelas/:id", async () => {
      await parcelasService.update(session, "2", { code: "X" } as never);
      expect(fetchMethod()).toBe("PATCH");
      expect(fetchUrl()).toContain("/parcelas/2");
    });
  });

  describe("#remove", () => {
    it("should DELETE /parcelas/:id", async () => {
      await parcelasService.remove(session, "1");
      expect(fetchMethod()).toBe("DELETE");
    });
  });

  describe("#updateAgronomo", () => {
    it("should PATCH /parcelas/:id/agronomo with usuarioId", async () => {
      await parcelasService.updateAgronomo(session, "3", "u1");
      expect(fetchMethod()).toBe("PATCH");
      expect(fetchUrl()).toContain("/parcelas/3/agronomo");
    });
  });
});
