import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { ALLOW_ANALYST_MUTATION_KEY } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
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
    "sources",
    "weatherLinkStatus",
    "reservorios",
    "reservorioHistorico"
  ] as const)("allows the three climate roles to call %s", (handler) => {
    expect(
      Reflect.getMetadata(REQUIRED_ROLES_KEY, ClimaController.prototype[handler])
    ).toEqual(["ADMIN", "ANALISTA", "AGRONOMO"]);
  });

  it.each(["forceWeatherLinkSync", "updateWeatherLinkStation"] as const)(
    "restricts %s to ADMIN",
    (handler) => {
      expect(
        Reflect.getMetadata(REQUIRED_ROLES_KEY, ClimaController.prototype[handler])
      ).toEqual(["ADMIN"]);
    }
  );

  it.each([
    "createReservorioLectura",
    "updateReservorioLectura",
    "deleteReservorioLectura"
  ] as const)("restricts %s to ADMIN and ANALISTA", (handler) => {
    expect(
      Reflect.getMetadata(REQUIRED_ROLES_KEY, ClimaController.prototype[handler])
    ).toEqual(["ADMIN", "ANALISTA"]);
    expect(
      Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, ClimaController.prototype[handler])
    ).toBe(true);
  });
});
