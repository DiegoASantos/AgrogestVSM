import { describe, expect, it } from "vitest";

import { ApiError, ApiTimeoutError } from "../../../shared/services/api/errors";
import {
  classifyRefreshFailure,
  isAnalystUser,
  isOfflineSessionExpired,
  isRefreshCooldownActive,
  resolveOfflineSessionExpiry
} from "./auth-session-policy";

describe("auth session refresh policy", () => {
  it("requires reauthentication only for terminal auth responses", () => {
    expect(classifyRefreshFailure(new ApiError("expired", 401))).toBe("reauth_required");
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

  it("identifies the role that is restricted to the web panel", () => {
    expect(isAnalystUser({ roles: ["ANALISTA"] })).toBe(true);
    expect(isAnalystUser({ roles: [" admin "] })).toBe(false);
    expect(isAnalystUser(null)).toBe(false);
  });

  it("uses the server's fixed session deadline", () => {
    const deadline = "2027-02-27T00:00:00.000Z";
    expect(
      resolveOfflineSessionExpiry(deadline, Date.parse("2026-09-30T00:00:00Z"))
    ).toBe(deadline);
    expect(isOfflineSessionExpired(deadline, Date.parse(deadline) - 1)).toBe(false);
    expect(isOfflineSessionExpired(deadline, Date.parse(deadline))).toBe(true);
    expect(
      resolveOfflineSessionExpiry(
        "2027-03-01T00:00:00.000Z",
        Date.parse("2026-09-30T00:00:00Z"),
        deadline
      )
    ).toBe(deadline);
  });

  it("retains the 30-day fallback for an older API response", () => {
    const now = Date.parse("2026-09-30T00:00:00Z");
    expect(resolveOfflineSessionExpiry(undefined, now)).toBe(
      new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
    );
    const existing = new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(resolveOfflineSessionExpiry(undefined, now, existing)).toBe(existing);
  });

  it("rejects an invalid or expired server deadline", () => {
    expect(resolveOfflineSessionExpiry("invalid", 100)).toBeNull();
    expect(resolveOfflineSessionExpiry("1970-01-01T00:00:00.100Z", 100)).toBeNull();
    expect(isOfflineSessionExpired("invalid", 100)).toBe(true);
    expect(
      resolveOfflineSessionExpiry(
        "2027-03-01T00:00:00.000Z",
        Date.parse("2027-02-27T00:00:00.000Z"),
        "2027-02-27T00:00:00.000Z"
      )
    ).toBeNull();
  });
});
