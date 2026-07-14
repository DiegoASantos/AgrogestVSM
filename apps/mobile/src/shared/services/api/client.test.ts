import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getApiToken = vi.fn(() => null as string | null);
const refreshApiToken = vi.fn(async () => null as string | null);

vi.mock("./config", () => ({
  getApiBaseUrl: () => "https://api.example.test"
}));

vi.mock("./auth-store", () => ({
  getApiToken: () => getApiToken(),
  refreshApiToken: () => refreshApiToken()
}));

const { apiRequest } = await import("./client");
const { ApiRequestAbortedError, ApiTimeoutError } = await import("./errors");

describe("apiRequest timeouts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getApiToken.mockReturnValue(null);
    refreshApiToken.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("aborts a request that exceeds its configured timeout", async () => {
    vi.stubGlobal("fetch", createAbortableFetch());

    const request = apiRequest("/slow", { timeoutMs: 25 });
    const assertion = expect(request).rejects.toBeInstanceOf(ApiTimeoutError);

    await vi.advanceTimersByTimeAsync(25);
    await assertion;
  });

  it("keeps the timeout active while reading the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => ({
        ok: true,
        status: 200,
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new Error("aborted body")),
              { once: true }
            );
          })
      }))
    );

    const request = apiRequest("/slow-body", { timeoutMs: 40 });
    const assertion = expect(request).rejects.toBeInstanceOf(ApiTimeoutError);

    await vi.advanceTimersByTimeAsync(40);
    await assertion;
  });

  it("distinguishes an external cancellation from a timeout", async () => {
    vi.stubGlobal("fetch", createAbortableFetch());
    const controller = new AbortController();
    const request = apiRequest("/cancelled", {
      signal: controller.signal,
      timeoutMs: 5_000
    });
    const assertion = expect(request).rejects.toBeInstanceOf(
      ApiRequestAbortedError
    );

    controller.abort();
    await assertion;
  });

  it("parses a successful response and clears its timer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: { id: "ok" },
            timestamp: "2026-07-12T00:00:00.000Z"
          }),
          { status: 200 }
        )
      )
    );

    await expect(apiRequest<{ id: string }>("/ok")).resolves.toEqual({ id: "ok" });
    expect(vi.getTimerCount()).toBe(0);
  });
});

function createAbortableFetch() {
  return vi.fn(
    async (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true }
        );
      })
  );
}
