import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { RecepcionSystraceClient } from "./recepcion-systrace.client";

const config = {
  systrace: { receptionUrl: "http://systrace.test/recepcion-cth", apiKey: "fixture-key" }
};

afterEach(() => vi.unstubAllGlobals());

describe("RecepcionSystraceClient", () => {
  it("uses the server API key and accepts the expected envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      total: 1,
      data: [{ nroguia: "TEST-1" }]
    })));
    vi.stubGlobal("fetch", fetchMock);

    const rows = await new RecepcionSystraceClient(config as never).list();

    expect(rows).toEqual([{ nroguia: "TEST-1" }]);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      headers: { "x-api-key": "fixture-key", Accept: "application/json" },
      redirect: "error"
    }));
  });

  it("rejects unexpected payloads without returning upstream details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { private: "upstream value" }
    }))));

    await expect(new RecepcionSystraceClient(config as never).list())
      .rejects.toThrow(ServiceUnavailableException);
  });

  it("rejects an oversized response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(5_000_001))));

    await expect(new RecepcionSystraceClient(config as never).list())
      .rejects.toThrow(ServiceUnavailableException);
  });
});
