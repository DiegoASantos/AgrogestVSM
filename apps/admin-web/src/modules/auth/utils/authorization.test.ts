import { describe, expect, it } from "vitest";

import type { AuthSession } from "../types/auth.types";
import {
  canAccessAdminPath,
  hasRole,
  isAdminSession,
  isRestrictedAdminPath
} from "./authorization";

function makeSession(roleCodes: string[]): AuthSession {
  return {
    accessToken: "t",
    tokenType: "Bearer",
    expiresIn: "3600",
    user: {
      id: "u-1",
      email: "u@test",
      fullName: "User",
      roles: roleCodes.map((code, index) => ({
        id: `r-${index}`,
        code,
        name: code
      }))
    }
  } as unknown as AuthSession;
}

describe("hasRole", () => {
  it("returns false for undefined roles", () => {
    expect(hasRole(undefined, "ADMIN")).toBe(false);
  });

  it("matches role codes case-insensitively and ignores whitespace", () => {
    expect(hasRole([{ code: " admin " }], "ADMIN")).toBe(true);
    expect(hasRole([{ code: "ADMIN" }], "admin")).toBe(true);
  });

  it("returns false when role is missing", () => {
    expect(hasRole([{ code: "VIEWER" }], "ADMIN")).toBe(false);
  });
});

describe("isAdminSession", () => {
  it("returns false for null/undefined session", () => {
    expect(isAdminSession(null)).toBe(false);
    expect(isAdminSession(undefined)).toBe(false);
  });

  it("returns true when session carries the ADMIN role", () => {
    expect(isAdminSession(makeSession(["ADMIN"]))).toBe(true);
  });

  it("returns false when session has only non-admin roles", () => {
    expect(isAdminSession(makeSession(["VIEWER", "AGRONOMO"]))).toBe(false);
  });
});

describe("isRestrictedAdminPath", () => {
  it.each([
    "/mantenimiento",
    "/mantenimiento/cultivos",
    "/seguridad",
    "/seguridad/usuarios"
  ])("flags %s as restricted", (path) => {
    expect(isRestrictedAdminPath(path)).toBe(true);
  });

  it.each(["/dashboard", "/visitas", "/mapas", "/"])(
    "does not flag %s as restricted",
    (path) => {
      expect(isRestrictedAdminPath(path)).toBe(false);
    }
  );
});

describe("canAccessAdminPath", () => {
  it("allows empty pathname regardless of session", () => {
    expect(canAccessAdminPath("", null)).toBe(true);
  });

  it("allows non-restricted paths for any session", () => {
    expect(canAccessAdminPath("/dashboard", null)).toBe(true);
    expect(canAccessAdminPath("/visitas", makeSession(["VIEWER"]))).toBe(true);
  });

  it("blocks restricted paths for non-admin sessions", () => {
    expect(canAccessAdminPath("/mantenimiento/cultivos", makeSession(["VIEWER"]))).toBe(
      false
    );
    expect(canAccessAdminPath("/seguridad", null)).toBe(false);
  });

  it("allows restricted paths for admin sessions", () => {
    expect(
      canAccessAdminPath("/mantenimiento/cultivos", makeSession(["ADMIN"]))
    ).toBe(true);
    expect(canAccessAdminPath("/seguridad/usuarios", makeSession(["ADMIN"]))).toBe(
      true
    );
  });
});
