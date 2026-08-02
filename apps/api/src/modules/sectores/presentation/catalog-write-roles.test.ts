import { describe, expect, it } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { SectoresController } from "./sectores.controller";
import { SubsectoresController } from "../../subsectores/presentation/subsectores.controller";

describe("territorial catalog write roles", () => {
  it.each([
    ["sectores", SectoresController.prototype.createSector],
    ["subsectores", SubsectoresController.prototype.createSubsector]
  ])("allows ADMIN and AGRONOMO to create %s", (_name, handler) => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual([
      "ADMIN",
      "AGRONOMO"
    ]);
  });

  it.each([
    ["sectores", SectoresController.prototype.deleteSector],
    ["subsectores", SubsectoresController.prototype.deleteSubsector]
  ])("keeps %s deletion restricted to ADMIN", (_name, handler) => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual(["ADMIN"]);
  });
});
