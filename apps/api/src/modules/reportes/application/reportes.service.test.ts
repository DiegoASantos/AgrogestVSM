import { describe, expect, it, vi } from "vitest";

import { ReportesService } from "./reportes.service";

describe("ReportesService", () => {
  it("returns active agronomists including zero results and calculates averages", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          agronomistUserId: "7",
          engineerName: "Ana Lopez",
          visitsCount: "5",
          visitDays: "2"
        },
        {
          agronomistUserId: "9",
          engineerName: "Luis Perez",
          visitsCount: "0",
          visitDays: "0"
        }
      ])
      .mockResolvedValueOnce([
        { visitDate: "2026-09-03", hectares: "12.50", visitsCount: "3" }
      ]);
    const service = new ReportesService({ query } as never);

    const result = await service.getVisitsReport({
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-30"
    });

    expect(result).toEqual({
      summary: [
        {
          agronomistUserId: "7",
          engineerName: "Ana Lopez",
          visitsCount: 5,
          visitDays: 2,
          dailyAverage: 2.5
        },
        {
          agronomistUserId: "9",
          engineerName: "Luis Perez",
          visitsCount: 0,
          visitDays: 0,
          dailyAverage: 0
        }
      ],
      timeline: [{ visitDate: "2026-09-03", hectares: 12.5, visitsCount: 3 }]
    });
    expect(query.mock.calls[0]?.[0]).toContain("LEFT JOIN visitas_campo");
    expect(query.mock.calls[0]?.[0]).toContain("COUNT(DISTINCT v.fecha_visita)");
    expect(query.mock.calls[1]?.[0]).toContain("SUM(v.area_ha)");
  });

  it("parameterizes engineer and producer filters in both aggregate queries", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new ReportesService({ query } as never);

    await service.getVisitsReport({
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-30",
      agronomo_usuario_id: "7",
      productor_id: "15"
    });

    expect(query.mock.calls[0]?.[0]).toContain("p.productor_id = $3");
    expect(query.mock.calls[0]?.[0]).toContain("u.id = $4");
    expect(query.mock.calls[0]?.[1]).toEqual([
      "2026-09-01",
      "2026-09-30",
      "15",
      "7"
    ]);
    expect(query.mock.calls[1]?.[0]).toContain("v.agronomo_usuario_id = $3");
    expect(query.mock.calls[1]?.[0]).toContain("p.productor_id = $4");
    expect(query.mock.calls[1]?.[1]).toEqual([
      "2026-09-01",
      "2026-09-30",
      "7",
      "15"
    ]);
  });

  it("rejects an inverted date range before querying", async () => {
    const query = vi.fn();
    const service = new ReportesService({ query } as never);

    await expect(
      service.getVisitsReport({
        fecha_desde: "2026-09-30",
        fecha_hasta: "2026-09-01"
      })
    ).rejects.toThrow("fecha_hasta must be greater than or equal to fecha_desde.");
    expect(query).not.toHaveBeenCalled();
  });
});

