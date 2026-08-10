import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { ClimaController } from "./clima.controller";

describe("ClimaController", () => {
  it("allows ADMIN and ANALISTA to read the web climate module", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, ClimaController)).toEqual([
      "ADMIN",
      "ANALISTA"
    ]);
  });
});
