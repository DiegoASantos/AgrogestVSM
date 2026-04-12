import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAllPaginated, setUnauthorizedHandler } from "./client";

type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function jsonResponse(payload: unknown, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  };
}

function successEnvelope<T>(data: T, meta?: Record<string, unknown>) {
  return {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString()
  };
}

function failureEnvelope(message: string, statusCode: number) {
  return {
    success: false,
    error: { message, statusCode }
  };
}

describe("fetchAllPaginated", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a single page when it is smaller than the page size", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(successEnvelope([{ id: "1" }, { id: "2" }], { total: 2 }))
    );

    const result = await fetchAllPaginated<{ id: string }>("/productores");

    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("walks multiple pages and stops when the last page is short", async () => {
    const page1 = Array.from({ length: 200 }, (_, index) => ({ id: `p1-${index}` }));
    const page2 = Array.from({ length: 50 }, (_, index) => ({ id: `p2-${index}` }));

    fetchMock
      .mockResolvedValueOnce(jsonResponse(successEnvelope(page1, { total: 250 })))
      .mockResolvedValueOnce(jsonResponse(successEnvelope(page2, { total: 250 })));

    const result = await fetchAllPaginated<{ id: string }>("/productores");

    expect(result).toHaveLength(250);
    expect(result[0]).toEqual({ id: "p1-0" });
    expect(result[249]).toEqual({ id: "p2-49" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops when meta.total is reached even if the server keeps returning full pages", async () => {
    const fullPage = Array.from({ length: 200 }, (_, index) => ({ id: `x-${index}` }));

    fetchMock.mockResolvedValue(jsonResponse(successEnvelope(fullPage, { total: 200 })));

    const result = await fetchAllPaginated<{ id: string }>("/parcelas");

    expect(result).toHaveLength(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("appends pagination params respecting an existing query string", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(successEnvelope([{ id: "a" }], { total: 1 }))
    );

    await fetchAllPaginated<{ id: string }>("/parcelas?activo=true");

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall?.[0] as string;

    expect(calledUrl).toContain("/parcelas?activo=true");
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("limit=200");
    expect(calledUrl).toContain("&page=");
  });

  it("appends pagination params using a leading question mark when no query is present", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(successEnvelope([{ id: "a" }], { total: 1 }))
    );

    await fetchAllPaginated<{ id: string }>("/sectores");

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/sectores?page=1&limit=200");
  });

  it("throws ApiError when the server rejects the request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(failureEnvelope("nope", 500), 500));

    await expect(fetchAllPaginated<{ id: string }>("/productores")).rejects.toThrow(
      "nope"
    );
  });

  it("is bounded by PAGINATION_MAX_PAGES even if the server never short-circuits", async () => {
    const fullPage = Array.from({ length: 200 }, (_, index) => ({ id: `x-${index}` }));
    // No total in meta, always full page → should stop at the hard cap (25 pages).
    fetchMock.mockResolvedValue(jsonResponse(successEnvelope(fullPage)));

    const result = await fetchAllPaginated<{ id: string }>("/productores");

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(25);
    expect(result.length).toBeLessThanOrEqual(25 * 200);
  });
});

describe("setUnauthorizedHandler", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it("invokes the registered handler on 401 before throwing", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    fetchMock.mockResolvedValueOnce(
      jsonResponse(failureEnvelope("unauthorized", 401), 401)
    );

    await expect(fetchAllPaginated<unknown>("/productores")).rejects.toThrow();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not invoke the handler on non-401 errors", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    fetchMock.mockResolvedValueOnce(
      jsonResponse(failureEnvelope("server down", 500), 500)
    );

    await expect(fetchAllPaginated<unknown>("/productores")).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it("unregisters the handler when setUnauthorizedHandler returns its cleanup", async () => {
    const handler = vi.fn();
    const cleanup = setUnauthorizedHandler(handler);
    cleanup();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(failureEnvelope("unauthorized", 401), 401)
    );

    await expect(fetchAllPaginated<unknown>("/productores")).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
