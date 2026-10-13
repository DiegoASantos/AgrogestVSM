import { describe, expect, it } from "vitest";
import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { FotosComercialesController } from "./fotos-comerciales.controller";

describe("commercial photo route permissions", () => {
  it("restricts upload to agronomists and viewing to admin or analyst", () => {
    const routes = FotosComercialesController.prototype;
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, routes.upload)).toEqual(["AGRONOMO"]);
    for (const route of [routes.listProducers, routes.listForProducer, routes.content]) {
      expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, route)).toEqual(["ADMIN", "ANALISTA"]);
    }
  });
});
