import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { ClimaController } from "./clima.controller";

describe("ClimaController", () => {
  it("keeps ADMIN as the secure default role for future endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, ClimaController)).toEqual(["ADMIN"]);
  });

  it.each([
    "summary",
    "map",
    "forecast",
    "history",
    "points",
    "stations",
    "alerts",
    "sources"
  ] as const)("allows the three climate roles to call %s", (handler) => {
    expect(
      Reflect.getMetadata(REQUIRED_ROLES_KEY, ClimaController.prototype[handler])
    ).toEqual(["ADMIN", "ANALISTA", "AGRONOMO"]);
  });
});
