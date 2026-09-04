import { describe, expect, it } from "vitest";

import { ALLOW_ANALYST_MUTATION_KEY } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { SectoresController } from "./sectores.controller";
import { SubsectoresController } from "../../subsectores/presentation/subsectores.controller";

describe("territorial catalog write roles", () => {
  it.each([
    ["sectores", SectoresController.prototype.createSector],
    ["subsectores", SubsectoresController.prototype.createSubsector]
  ])("allows ADMIN, ANALISTA and AGRONOMO to create %s", (_name, handler) => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual([
      "ADMIN",
      "ANALISTA",
      "AGRONOMO"
    ]);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, handler)).toBe(true);
  });

  it.each([
    ["sectores", SectoresController.prototype.deleteSector],
    ["subsectores", SubsectoresController.prototype.deleteSubsector]
  ])("allows ADMIN and ANALISTA to delete %s", (_name, handler) => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual([
      "ADMIN",
      "ANALISTA"
    ]);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, handler)).toBe(true);
  });
});
