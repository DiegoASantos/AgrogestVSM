import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { MobileClimaController } from "./mobile-clima.controller";

describe("MobileClimaController", () => {
  it("requires AGRONOMO or ADMIN at the API boundary", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, MobileClimaController)).toEqual([
      "AGRONOMO",
      "ADMIN"
    ]);
  });
});
