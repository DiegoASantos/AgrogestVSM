import { describe, expect, it } from "vitest";

import {
  createErrorResponse,
  createPaginatedMeta,
  createSuccessResponse
} from "./api-response";

describe("createSuccessResponse", () => {
  it("wraps data without meta by default", () => {
    const res = createSuccessResponse({ id: "1" });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: "1" });
    expect("meta" in res).toBe(false);
    expect(() => new Date(res.timestamp).toISOString()).not.toThrow();
  });

  it("includes meta when provided", () => {
    const res = createSuccessResponse([1, 2], { total: 2 });
    expect(res.meta).toEqual({ total: 2 });
  });
});

describe("createPaginatedMeta", () => {
  it("computes totalPages correctly for exact multiples", () => {
    expect(createPaginatedMeta(100, 1, 50)).toEqual({
      total: 100,
      page: 1,
      limit: 50,
      totalPages: 2
    });
  });

  it("rounds totalPages up when there is a partial last page", () => {
    expect(createPaginatedMeta(101, 1, 50).totalPages).toBe(3);
  });

  it("returns totalPages 0 when total is 0", () => {
    expect(createPaginatedMeta(0, 1, 50).totalPages).toBe(0);
  });
});

describe("createErrorResponse", () => {
  it("builds a structured error envelope", () => {
    const res = createErrorResponse({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Parcela no encontrada",
      path: "/parcelas/xyz",
      method: "GET"
    });
    expect(res.success).toBe(false);
    expect(res.error.statusCode).toBe(404);
    expect(res.error.code).toBe("NOT_FOUND");
    expect("details" in res.error).toBe(false);
  });

  it("includes details when provided", () => {
    const res = createErrorResponse({
      statusCode: 400,
      code: "VALIDATION",
      message: "bad",
      path: "/x",
      method: "POST",
      details: [{ field: "email" }]
    });
    expect(res.error.details).toEqual([{ field: "email" }]);
  });
});
