import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api/errors";

// Stub the services barrel so importing sync-errors does not pull in
// expo-sqlite / react-native via the api/auth-store → database chain.
vi.mock("../services", async () => {
  const errors = await import("../services/api/errors");
  return { ApiError: errors.ApiError, toApiError: errors.toApiError };
});

const { classifyError } = await import("./sync-errors");

describe("classifyError", () => {
  it("classifies network-less errors (no statusCode) as transient", () => {
    const result = classifyError(new Error("network down"));

    expect(result.kind).toBe("transient");
    expect(result.statusCode).toBeNull();
    expect(result.message).toBe("network down");
  });

  it("classifies unknown non-Error values as transient with default message", () => {
    const result = classifyError("boom");

    expect(result.kind).toBe("transient");
    expect(result.message).toBe("Unexpected API error.");
  });

  it.each([0, 408, 429, 500, 502, 503, 504])(
    "classifies status %s as transient",
    (status) => {
      const result = classifyError(new ApiError("fail", status));
      expect(result.kind).toBe("transient");
      expect(result.statusCode).toBe(status);
    }
  );

  it("classifies 409 as conflict", () => {
    const result = classifyError(new ApiError("conflict", 409));
    expect(result.kind).toBe("conflict");
    expect(result.statusCode).toBe(409);
  });

  it.each([401, 403])("classifies status %s as auth", (status) => {
    const result = classifyError(new ApiError("unauth", status));
    expect(result.kind).toBe("auth");
    expect(result.statusCode).toBe(status);
  });

  it.each([400, 404, 422])("classifies status %s as permanent", (status) => {
    const result = classifyError(new ApiError("bad", status));
    expect(result.kind).toBe("permanent");
    expect(result.statusCode).toBe(status);
  });

  it("preserves the original ApiError message", () => {
    const result = classifyError(new ApiError("validation failed", 422));
    expect(result.message).toBe("validation failed");
  });
});
