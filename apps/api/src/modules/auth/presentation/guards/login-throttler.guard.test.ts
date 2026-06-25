import { describe, expect, it } from "vitest";

import { getLoginRateLimitTracker } from "./login-throttler.guard";

describe("getLoginRateLimitTracker", () => {
  it("uses the client IP reported by Fastify", () => {
    expect(getLoginRateLimitTracker({ ip: "203.0.113.10" })).toBe("203.0.113.10");
  });

  it("falls back to a stable tracker when no IP is available", () => {
    expect(getLoginRateLimitTracker({ ip: "" })).toBe("unknown-client");
  });
});
