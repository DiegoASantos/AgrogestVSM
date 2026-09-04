import { describe, expect, it } from "vitest";

import type { AuthSession } from "../types/auth.types";
import {
  canManageReservoirReadings,
  canAccessAdminPath,
  hasRole,
  isAdminOrAnalystSession,
  isAgronomistSession,
  isAnalystSession,
  isAdminSession,
  isClimatePath,
  isClimateSession,
  isMaintenancePath,
  isReportsPath,
  isSecurityPath,
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

describe("isAnalystSession", () => {
  it("matches ANALISTA sessions", () => {
    expect(isAnalystSession(makeSession(["ANALISTA"]))).toBe(true);
    expect(isAnalystSession(makeSession(["ADMIN"]))).toBe(false);
  });
});

describe("admin or analyst roles", () => {
  it.each(["ADMIN", "ANALISTA"])("allows %s", (role) => {
    expect(isAdminOrAnalystSession(makeSession([role]))).toBe(true);
  });

  it("rejects AGRONOMO", () => {
    expect(isAdminOrAnalystSession(makeSession(["AGRONOMO"]))).toBe(false);
  });
});

describe("climate roles", () => {
  it("matches AGRONOMO sessions", () => {
    expect(isAgronomistSession(makeSession(["AGRONOMO"]))).toBe(true);
    expect(isAgronomistSession(makeSession(["ANALISTA"]))).toBe(false);
  });

  it.each(["ADMIN", "ANALISTA", "AGRONOMO"])("allows %s to use climate views", (role) => {
    expect(isClimateSession(makeSession([role]))).toBe(true);
  });

  it("rejects unrelated roles from climate views", () => {
    expect(isClimateSession(makeSession(["VIEWER"]))).toBe(false);
  });

  it.each(["ADMIN", "ANALISTA"])("allows %s to manage reservoir readings", (role) => {
    expect(canManageReservoirReadings(makeSession([role]))).toBe(true);
  });

  it("keeps AGRONOMO reservoir access read-only", () => {
    expect(canManageReservoirReadings(makeSession(["AGRONOMO"]))).toBe(false);
  });
});

describe("isClimatePath", () => {
  it.each(["/clima", "/clima/resumen", "/clima/mapa/detalle"])("matches %s", (path) =>
    expect(isClimatePath(path)).toBe(true)
  );

  it.each(["/dashboard", "/climatologia"])("does not match %s", (path) =>
    expect(isClimatePath(path)).toBe(false)
  );
});

describe("isRestrictedAdminPath", () => {
  it.each([
    "/mantenimiento",
    "/mantenimiento/cultivos",
    "/reportes",
    "/seguridad",
    "/seguridad/usuarios"
  ])("flags %s as restricted", (path) => {
    expect(isRestrictedAdminPath(path)).toBe(true);
  });

  it.each(["/dashboard", "/visitas", "/mapas", "/clima/resumen", "/"])(
    "does not flag %s as restricted",
    (path) => {
      expect(isRestrictedAdminPath(path)).toBe(false);
    }
  );
});

describe("role-restricted path matchers", () => {
  it("matches maintenance, reports and security independently", () => {
    expect(isMaintenancePath("/mantenimiento/parcelas/1/geodatos")).toBe(true);
    expect(isReportsPath("/reportes")).toBe(true);
    expect(isSecurityPath("/seguridad/usuarios")).toBe(true);
    expect(isReportsPath("/reporte-excel")).toBe(false);
  });
});

describe("canAccessAdminPath", () => {
  it("allows empty pathname regardless of session", () => {
    expect(canAccessAdminPath("", null)).toBe(true);
  });

  it("allows ordinary non-restricted paths for any session", () => {
    expect(canAccessAdminPath("/dashboard", null)).toBe(true);
    expect(canAccessAdminPath("/visitas", makeSession(["VIEWER"]))).toBe(true);
  });

  it.each(["ADMIN", "ANALISTA", "AGRONOMO"])(
    "allows %s to open climate routes",
    (role) => {
      expect(canAccessAdminPath("/clima/resumen", makeSession([role]))).toBe(true);
    }
  );

  it("blocks climate routes for unrelated roles", () => {
    expect(canAccessAdminPath("/clima/resumen", makeSession(["VIEWER"]))).toBe(false);
    expect(canAccessAdminPath("/clima/mapa", null)).toBe(false);
  });

  it("blocks restricted paths for unrelated sessions", () => {
    expect(canAccessAdminPath("/mantenimiento/cultivos", makeSession(["VIEWER"]))).toBe(
      false
    );
    expect(canAccessAdminPath("/seguridad", null)).toBe(false);
  });

  it("allows ADMIN to open all restricted paths", () => {
    expect(canAccessAdminPath("/mantenimiento/cultivos", makeSession(["ADMIN"]))).toBe(
      true
    );
    expect(canAccessAdminPath("/seguridad/usuarios", makeSession(["ADMIN"]))).toBe(true);
    expect(canAccessAdminPath("/reportes", makeSession(["ADMIN"]))).toBe(true);
  });

  it("allows ANALISTA in maintenance and reports but not security", () => {
    const analystSession = makeSession(["ANALISTA"]);

    expect(canAccessAdminPath("/mantenimiento/cultivos", analystSession)).toBe(true);
    expect(canAccessAdminPath("/reportes", analystSession)).toBe(true);
    expect(canAccessAdminPath("/seguridad/usuarios", analystSession)).toBe(false);
  });

  it("blocks AGRONOMO from maintenance and reports", () => {
    const agronomistSession = makeSession(["AGRONOMO"]);

    expect(canAccessAdminPath("/mantenimiento", agronomistSession)).toBe(false);
    expect(canAccessAdminPath("/reportes", agronomistSession)).toBe(false);
  });
});
