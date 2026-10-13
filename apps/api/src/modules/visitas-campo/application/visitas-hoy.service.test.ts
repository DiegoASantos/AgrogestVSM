import { describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";

import { VisitasHoyService } from "./visitas-hoy.service";

describe("VisitasHoyService", () => {
  it("checks parcel assignment before exposing today's visits", async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const service = new VisitasHoyService({ query } as unknown as DataSource);

    await expect(service.findByParcela("4", { userId: "7", roles: ["AGRONOMO"] }))
      .rejects.toThrow("Parcela not found.");
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual(["4", "7"]);
  });

  it("returns only the small visit summary needed for the notice", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ id: "4" }])
      .mockResolvedValueOnce([{ "?column?": 1 }]);
    const service = new VisitasHoyService({ query } as unknown as DataSource);

    const response = await service.findByParcela("4", { userId: "7", roles: ["AGRONOMO"] });

    expect(query.mock.calls[1][0]).toContain("America/Lima");
    expect(response.data).toEqual({ exists: true });
  });
});
