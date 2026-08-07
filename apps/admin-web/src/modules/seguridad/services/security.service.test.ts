import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { securityService } from "./security.service";

const session = { accessToken: "tok", tokenType: "Bearer" };

function apiResponse(data: unknown) { return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data, meta: { total: 1 }, timestamp: "" })) }; }

beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([]))); });
afterEach(() => { vi.unstubAllGlobals(); });

function fetchUrl() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? String((c[c.length - 1] as string[])[0]) : ""; }
function fetchMethod() { const c = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; return c.length ? (c[c.length - 1] as Record<string, unknown>[])[1]?.method : ""; }

describe("securityService", () => {
  describe("#getUsers", () => {
    it("should GET /usuarios", async () => {
      await securityService.getUsers(session);
      expect(fetchUrl()).toContain("/usuarios");
    });
  });

  describe("#createUser", () => {
    it("should POST /usuarios", async () => {
      await securityService.createUser(session, { firstName: "J" } as never);
      expect(fetchMethod()).toBe("POST");
    });
  });

  describe("#updateUser", () => {
    it("should PATCH /usuarios/:id", async () => {
      await securityService.updateUser(session, "1", { firstName: "J" } as never);
      expect(fetchMethod()).toBe("PATCH");
      expect(fetchUrl()).toContain("/usuarios/1");
    });
  });

  describe("#deleteUser", () => {
    it("should DELETE /usuarios/:id", async () => {
      await securityService.deleteUser(session, "1");
      expect(fetchMethod()).toBe("DELETE");
    });
  });

  describe("#getRoles", () => {
    it("should GET /roles", async () => {
      await securityService.getRoles(session);
      expect(fetchUrl()).toContain("/roles");
    });
  });

  describe("#createRole", () => {
    it("should POST /roles", async () => {
      await securityService.createRole(session, { code: "X" } as never);
      expect(fetchMethod()).toBe("POST");
    });
  });

  describe("#updateRole", () => {
    it("should PATCH /roles/:id", async () => {
      await securityService.updateRole(session, "2", { name: "Y" } as never);
      expect(fetchMethod()).toBe("PATCH");
    });
  });

  describe("#deleteRole", () => {
    it("should DELETE /roles/:id", async () => {
      await securityService.deleteRole(session, "2");
      expect(fetchMethod()).toBe("DELETE");
    });
  });

  describe("#getUserRoles", () => {
    it("should GET with optional query params", async () => {
      await securityService.getUserRoles(session, { userId: "u1" });
      expect(fetchUrl()).toContain("usuario_id=u1");
    });
  });

  describe("#createUserRole", () => {
    it("should POST /usuario-roles", async () => {
      await securityService.createUserRole(session, { usuarioId: "u1", rolId: 1 } as never);
      expect(fetchMethod()).toBe("POST");
    });
  });

  describe("#deleteUserRole", () => {
    it("should DELETE /usuario-roles/:id", async () => {
      await securityService.deleteUserRole(session, "u1", "r1");
      expect(fetchMethod()).toBe("DELETE");
    });
  });
});
