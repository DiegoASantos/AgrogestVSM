import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { estimacionesService } from "./estimaciones.service";

const session = { accessToken: "token", tokenType: "Bearer" } as const;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            success: true,
            data: { startDate: "2026-09-07", endDate: "2026-09-13", rows: [] },
            timestamp: ""
          })
        )
    })
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("estimacionesService", () => {
  it("loads an authenticated week", async () => {
    await estimacionesService.getWeek(session, "2026-09-07");

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain("/estimaciones/semanas/2026-09-07");
    expect(options.headers.Authorization).toBe("Bearer token");
  });

  it("saves a batch with PUT and an explicit null removal", async () => {
    await estimacionesService.saveWeek(session, "2026-09-07", [
      { agronomoUsuarioId: "7", visitasEstimadas: null }
    ]);

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(options.method).toBe("PUT");
    expect(JSON.parse(String(options.body))).toEqual({
      estimaciones: [{ agronomoUsuarioId: "7", visitasEstimadas: null }]
    });
  });
});
