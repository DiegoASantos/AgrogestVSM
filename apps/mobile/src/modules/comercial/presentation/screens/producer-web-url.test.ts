import { describe, expect, it } from "vitest";

import { isProducerWebUrlAllowed, PRODUCTION_PRODUCTOR_WEB_URL } from "./producer-web-url";

describe("isProducerWebUrlAllowed", () => {
  it("allows the configured production public IP route", () => {
    expect(isProducerWebUrlAllowed(PRODUCTION_PRODUCTOR_WEB_URL, false)).toBe(true);
  });

  it("rejects other HTTP URLs in production", () => {
    expect(isProducerWebUrlAllowed("http://example.com/productor/acreedores", false)).toBe(false);
    expect(isProducerWebUrlAllowed("http://190.119.191.195:5177/productor/acreedores", false)).toBe(false);
  });

  it("allows HTTPS URLs in production", () => {
    expect(isProducerWebUrlAllowed("https://portal.example/productor/acreedores", false)).toBe(true);
  });

  it("continues to allow local HTTP URLs in development", () => {
    expect(isProducerWebUrlAllowed("http://localhost:5176/productor/acreedores", true)).toBe(true);
  });

  it("rejects an unset URL", () => {
    expect(isProducerWebUrlAllowed(undefined, false)).toBe(false);
  });
});
