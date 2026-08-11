import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./env.validation";

const REQUIRED_ENV = {
  DB_NAME: "agrogest_test",
  DB_PASSWORD: "local-test-password",
  JWT_ACCESS_SECRET: "access-secret-with-at-least-32-characters",
  JWT_REFRESH_SECRET: "refresh-secret-with-at-least-32-characters"
};

describe("validateEnvironment", () => {
  it("uses secure operational defaults in production", () => {
    const result = validateEnvironment({
      ...REQUIRED_ENV,
      NODE_ENV: "production"
    });

    expect(result.APP_TRUST_PROXY).toBe(true);
    expect(result.DB_SSL_REJECT_UNAUTHORIZED).toBe(true);
    expect(result.LOGIN_RATE_LIMIT_TTL_MS).toBe(60_000);
    expect(result.LOGIN_RATE_LIMIT_MAX).toBe(5);
    expect(result.LOGIN_RATE_LIMIT_BLOCK_MS).toBe(300_000);
  });

  it("accepts explicit rate-limit and proxy settings", () => {
    const result = validateEnvironment({
      ...REQUIRED_ENV,
      APP_TRUST_PROXY: "false",
      LOG_LEVEL: "debug",
      COST_BUILD_API_KEY: " test-cost-build-key ",
      LOGIN_RATE_LIMIT_TTL_MS: "30000",
      LOGIN_RATE_LIMIT_MAX: "8",
      LOGIN_RATE_LIMIT_BLOCK_MS: "120000"
    });

    expect(result.APP_TRUST_PROXY).toBe(false);
    expect(result.LOG_LEVEL).toBe("debug");
    expect(result.COST_BUILD_API_KEY).toBe("test-cost-build-key");
    expect(result.LOGIN_RATE_LIMIT_TTL_MS).toBe(30_000);
    expect(result.LOGIN_RATE_LIMIT_MAX).toBe(8);
    expect(result.LOGIN_RATE_LIMIT_BLOCK_MS).toBe(120_000);
  });

  it("rejects invalid operational limits", () => {
    expect(() =>
      validateEnvironment({
        ...REQUIRED_ENV,
        LOGIN_RATE_LIMIT_MAX: "0"
      })
    ).toThrow("LOGIN_RATE_LIMIT_MAX must be a positive integer.");
  });

  it("rejects invalid log levels", () => {
    expect(() =>
      validateEnvironment({
        ...REQUIRED_ENV,
        LOG_LEVEL: "verbose"
      })
    ).toThrow("LOG_LEVEL must be one of trace, debug, info, warn, error or fatal.");
  });

  it("keeps WeatherLink disabled by default and validates enabled credentials", () => {
    const disabled = validateEnvironment(REQUIRED_ENV);
    expect(disabled.WEATHERLINK_ENABLED).toBe(false);
    expect(disabled.WEATHERLINK_DAILY_SYNC_HOUR).toBe(8);
    expect(disabled.WEATHERLINK_CATCHUP_MAX_DAYS).toBe(30);

    expect(() =>
      validateEnvironment({ ...REQUIRED_ENV, WEATHERLINK_ENABLED: "true" })
    ).toThrow(
      "WEATHERLINK_API_KEY and WEATHERLINK_API_SECRET are required when WEATHERLINK_ENABLED=true."
    );

    const enabled = validateEnvironment({
      ...REQUIRED_ENV,
      WEATHERLINK_ENABLED: "true",
      WEATHERLINK_API_KEY: "test-key",
      WEATHERLINK_API_SECRET: "test-secret"
    });
    expect(enabled.WEATHERLINK_ENABLED).toBe(true);
  });

  it("rejects an invalid WeatherLink IANA time zone at startup", () => {
    expect(() =>
      validateEnvironment({
        ...REQUIRED_ENV,
        WEATHERLINK_TIME_ZONE: "Lima/not-a-zone"
      })
    ).toThrow("WEATHERLINK_TIME_ZONE must be a valid IANA time zone.");
  });
});
