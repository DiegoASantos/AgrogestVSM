import { describe, expect, it } from "vitest";

import { getApiBaseUrl } from "./config";

describe("getApiBaseUrl", () => {
  it("should return default URL when env variable is not set", () => {
    const original = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;

    const result = getApiBaseUrl();

    expect(result).toBe("http://127.0.0.1:3001");

    if (original !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = original;
    }
  });

  it("should return default URL when env variable is empty string", () => {
    const original = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "";

    const result = getApiBaseUrl();

    expect(result).toBe("http://127.0.0.1:3001");

    process.env.NEXT_PUBLIC_API_URL = original as string | undefined;
  });

  it("should return trimmed env value without trailing slashes", () => {
    const original = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "  https://api.agrogest.pe/v1//  ";

    const result = getApiBaseUrl();

    expect(result).toBe("https://api.agrogest.pe/v1");

    process.env.NEXT_PUBLIC_API_URL = original as string | undefined;
  });
});
