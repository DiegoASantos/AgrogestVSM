import { describe, expect, it } from "vitest";

import {
  ApiError,
  ApiTimeoutError
} from "../../../shared/services/api/errors";
import {
  classifyRefreshFailure,
  isRefreshCooldownActive
} from "./auth-session-policy";

describe("auth session refresh policy", () => {
  it("requires reauthentication only for terminal auth responses", () => {
    expect(classifyRefreshFailure(new ApiError("expired", 401))).toBe(
      "reauth_required"
    );
    expect(classifyRefreshFailure(new ApiError("forbidden", 403))).toBe(
      "reauth_required"
    );
  });

  it("keeps network, timeout and server failures transient", () => {
    expect(classifyRefreshFailure(new ApiTimeoutError())).toBe("transient");
    expect(classifyRefreshFailure(new ApiError("server", 503))).toBe("transient");
    expect(classifyRefreshFailure(new Error("network"))).toBe("transient");
  });

  it("uses a strict cooldown boundary", () => {
    expect(isRefreshCooldownActive(61_000, 1_000)).toBe(true);
    expect(isRefreshCooldownActive(61_000, 61_000)).toBe(false);
  });
});
