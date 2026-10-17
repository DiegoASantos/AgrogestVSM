import { describe, expect, it } from "vitest";
import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { VisitasComercialesController } from "./visitas-comerciales.controller";

describe("commercial visit route permissions", () => {
  it("limits exports to ADMIN/ANALISTA and authorizes mobile creation", () => {
    const routes = VisitasComercialesController.prototype;
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, routes.create)).toEqual([
      "AGRONOMO",
      "ADMIN"
    ]);
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, routes.list)).toEqual([
      "AGRONOMO",
      "ADMIN",
      "ANALISTA"
    ]);
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, routes.get)).toEqual([
      "AGRONOMO",
      "ADMIN",
      "ANALISTA"
    ]);
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, routes.exportExcel)).toEqual([
      "ADMIN",
      "ANALISTA"
    ]);
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, routes.exportPdf)).toEqual([
      "ADMIN",
      "ANALISTA"
    ]);
  });
});
