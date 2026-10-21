import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { ALLOW_ANALYST_MUTATION_KEY } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { AdminAcreedoresCosechaController, PagosProductoresController } from "./pagos-productores.controller";

describe("PagosProductoresController permissions", () => {
  it("restricts reception balances and payment mutations to ADMIN, ANALISTA and TESORERO_PAGOS", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, PagosProductoresController))
      .toEqual(["ADMIN", "ANALISTA", "TESORERO_PAGOS"]);
    const routes = PagosProductoresController.prototype;
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, routes.createComplete)).toBe(true);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, routes.updateComplete)).toBe(true);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, routes.saveDetailsBatch)).toBe(true);
  });
});

describe("AdminAcreedoresCosechaController permissions", () => {
  it("limits document search and approval to ADMIN/ANALISTA/TESORERO_PAGOS", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminAcreedoresCosechaController))
      .toEqual(["ADMIN", "ANALISTA", "TESORERO_PAGOS"]);
    const routes = AdminAcreedoresCosechaController.prototype;
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, routes.searchByDocument)).toBe(true);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, routes.review)).toBe(true);
  });
});
