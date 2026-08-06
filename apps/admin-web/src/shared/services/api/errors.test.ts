import { describe, expect, it } from "vitest";

import { ApiError, toApiError } from "./errors";

describe("ApiError", () => {
  it("should create an error with message, statusCode, and details", () => {
    const error = new ApiError("Not found", 404, { entity: "user" });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ entity: "user" });
  });

  it("should default statusCode and details to undefined", () => {
    const error = new ApiError("Generic error");

    expect(error.statusCode).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});

describe("toApiError", () => {
  it("should return the same ApiError instance", () => {
    const original = new ApiError("Original error", 500);
    const result = toApiError(original);

    expect(result).toBe(original);
  });

  it("should wrap a plain Error in ApiError", () => {
    const original = new Error("Something broke");

    const result = toApiError(original);

    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("Something broke");
    expect(result.statusCode).toBeUndefined();
  });

  it("should return a default ApiError for non-Error values", () => {
    const result = toApiError("raw string");

    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("Ocurrio un error inesperado.");
  });

  it("should return a default ApiError for null/undefined", () => {
    const result = toApiError(null);

    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("Ocurrio un error inesperado.");
  });
});
