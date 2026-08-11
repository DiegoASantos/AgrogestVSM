import { afterEach, describe, expect, it, vi } from "vitest";

import { WeatherLinkClient, WeatherLinkRequestError } from "./weatherlink.client";

const config = {
  weatherLink: {
    enabled: true,
    apiKey: "fixture-key",
    apiSecret: "fixture-secret",
    dailySyncHour: 8,
    timeZone: "America/Lima",
    catchupMaxDays: 30,
    requestTimeoutMs: 8_000
  }
};

afterEach(() => vi.unstubAllGlobals());

describe("WeatherLinkClient", () => {
  it("uses the v2 query key and secret header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stations: [] })
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new WeatherLinkClient(config as never);

    await client.stations();

    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe("https://api.weatherlink.com/v2/stations");
    expect(url.searchParams.get("api-key")).toBe("fixture-key");
    expect(options.headers).toEqual({ "X-Api-Secret": "fixture-secret" });
  });

  it("returns a sanitized provider error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const client = new WeatherLinkClient(config as never);

    const error = await client.stations().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(WeatherLinkRequestError);
    expect(String((error as Error).message)).toBe(
      "WeatherLink respondio con estado 401."
    );
    expect(String((error as Error).message)).not.toContain("fixture-secret");
    expect(String((error as Error).message)).not.toContain("fixture-key");
  });

  it.each([
    ["missing sensors", {}],
    ["malformed sensor", { sensors: [null] }],
    ["malformed sensor data", { sensors: [{ data: "invalid" }] }]
  ])(
    "rejects incomplete historic payloads without advancing callers: %s",
    async (_, body) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => body })
      );
      const client = new WeatherLinkClient(config as never);

      await expect(client.historic("station-1", 1, 2)).rejects.toThrow(
        "WeatherLink devolvio datos historicos incompletos."
      );
    }
  );

  it("accepts an explicit empty sensor list as a complete empty day", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sensors: [] }) })
    );
    const client = new WeatherLinkClient(config as never);

    await expect(client.historic("station-1", 1, 2)).resolves.toEqual({ sensors: [] });
  });

  it("treats missing reports as a gap and preserves valid records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sensors: [
            { data: null },
            { data: [{}, { ts: NaN }, { ts: 1_723_500_000, temp_out: 80 }] }
          ]
        })
      })
    );
    const client = new WeatherLinkClient(config as never);

    await expect(client.historic("station-1", 1, 2)).resolves.toEqual({
      sensors: [{ data: [] }, { data: [{ ts: 1_723_500_000, temp_out: 80 }] }]
    });
  });
});
