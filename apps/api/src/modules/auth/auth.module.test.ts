import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";

import { createAuthJwtModuleOptions } from "./auth.module";

describe("AuthModule JWT options", () => {
  it("allows token-specific exp claims without a conflicting default expiry", async () => {
    const secret = "test-access-secret-at-least-32-chars!!";
    const jwt = new JwtService(createAuthJwtModuleOptions(secret));
    const exp = Math.floor(Date.now() / 1000) + 60;

    const token = await jwt.signAsync(
      { sub: "public-id-1", exp },
      { secret }
    );

    expect(jwt.decode(token)).toMatchObject({ exp });
  });
});
