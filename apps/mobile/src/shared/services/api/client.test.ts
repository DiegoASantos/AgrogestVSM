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
const { ApiOfflineModeError, ApiRequestAbortedError, ApiTimeoutError } =
  await import("./errors");
const { resetConnectivityPolicyForTests, setConnectivityPolicySnapshot } =
  await import("../../connectivity/connectivity-policy");

describe("apiRequest timeouts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getApiToken.mockReturnValue(null);
    refreshApiToken.mockResolvedValue(null);
    resetConnectivityPolicyForTests();
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
    const assertion = expect(request).rejects.toBeInstanceOf(ApiRequestAbortedError);

    controller.abort();
    await assertion;
  });

  it("parses a successful response and clears its timer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
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

  it("blocks standard requests before fetch while manual offline is active", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setConnectivityPolicySnapshot({
      effectiveMode: "offline_manual",
      isPhysicallyOnline: true,
      preference: "offline"
    });

    await expect(apiRequest("/blocked")).rejects.toBeInstanceOf(ApiOfflineModeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows an essential login request while manual offline is active", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              data: { accessToken: "token" },
              timestamp: "2026-08-17T00:00:00.000Z"
            }),
            { status: 200 }
          )
      )
    );
    setConnectivityPolicySnapshot({
      effectiveMode: "offline_manual",
      isPhysicallyOnline: true,
      preference: "offline"
    });

    await expect(
      apiRequest<{ accessToken: string }>("/auth/login", {
        networkPolicy: "essential"
      })
    ).resolves.toEqual({ accessToken: "token" });
  });
});

function createAbortableFetch() {
  return vi.fn(
    async (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true
        });
      })
  );
}
