import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { UsersController } from "./users.controller";

describe("UsersController", () => {
  it("allows analysts to read only the minimum agronomist lookup", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_ROLES_KEY,
        UsersController.prototype.getActiveAgronomists
      )
    ).toEqual(["ADMIN", "ANALISTA"]);
  });
});
