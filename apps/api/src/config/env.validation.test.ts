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
      LOGIN_RATE_LIMIT_TTL_MS: "30000",
      LOGIN_RATE_LIMIT_MAX: "8",
      LOGIN_RATE_LIMIT_BLOCK_MS: "120000"
    });

    expect(result.APP_TRUST_PROXY).toBe(false);
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
});
