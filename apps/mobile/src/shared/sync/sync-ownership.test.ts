import { describe, expect, it } from "vitest";
import { getSyncEntityOwnership } from "./sync-ownership";

describe("commercial visit sync ownership", () => {
  it("uses the authenticated local owner", () => {
    expect(getSyncEntityOwnership("visitas_comerciales", "visitas_comerciales", "user-7"))
      .toEqual({ sql: "AND visitas_comerciales.owner_user_id = ?", parameters: ["user-7"] });
  });
});
