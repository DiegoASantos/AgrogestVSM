import { describe, expect, it } from "vitest";
import type { AuthSession } from "../types/auth.types";
import { canAccessAdminPath, getAdminLandingPath } from "./authorization";

const session = (codes = ["TESORERO_PAGOS"]) => ({ user: { roles: codes.map((code) => ({ code })) } }) as AuthSession;

describe("Rutas Tesorero Pagos", () => {
  it.each(["/pagos", "/pagos/nuevo", "/pagos/abc", "/mantenimiento/productores", "/mantenimiento/parcelas", "/mantenimiento/parcelas/1/geodatos", "/mantenimiento/acreedores-cosecha", "/perfil"])("permite %s", (path) => {
    expect(canAccessAdminPath(path, session())).toBe(true);
  });
  it.each(["/dashboard", "/visitas", "/visitas/productores/1", "/mapas", "/estimaciones", "/comercial", "/clima/resumen", "/reportes", "/seguridad/usuarios", "/mantenimiento", "/mantenimiento/cultivos", "/mantenimiento/productores/duplicados", "/mantenimiento/acreedores-cosecha/fotos", "/otra-ruta"])("deniega %s", (path) => {
    expect(canAccessAdminPath(path, session())).toBe(false);
  });
  it("suma permisos conservando restricciones de cada rol", () => {
    expect(canAccessAdminPath("/seguridad/usuarios", session(["TESORERO_PAGOS", "ADMIN"]))).toBe(true);
    expect(canAccessAdminPath("/estimaciones", session(["TESORERO_PAGOS", "ANALISTA"]))).toBe(true);
    expect(canAccessAdminPath("/visitas", session(["TESORERO_PAGOS", "AGRONOMO"]))).toBe(true);
    expect(canAccessAdminPath("/seguridad", session(["TESORERO_PAGOS", "ANALISTA"]))).toBe(false);
  });
  it("elige un inicio accesible", () => {
    expect(getAdminLandingPath(session())).toBe("/pagos");
    expect(getAdminLandingPath(session(["ADMIN", "TESORERO_PAGOS"]))).toBe("/dashboard");
  });
});
