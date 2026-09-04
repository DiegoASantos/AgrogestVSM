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
    expect(query.mock.calls[0]?.[1]).toEqual(["2026-09-01", "2026-09-30", "15", "7"]);
    expect(query.mock.calls[1]?.[0]).toContain("v.agronomo_usuario_id = $3");
    expect(query.mock.calls[1]?.[0]).toContain("p.productor_id = $4");
    expect(query.mock.calls[1]?.[1]).toEqual(["2026-09-01", "2026-09-30", "7", "15"]);
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

  it("builds the fields-by-stage summary from one latest visit per parcel", async () => {
    const stages = [
      { id: "1", name: "Brotamiento", type: "Etapa", sortOrder: "1" },
      { id: "2", name: "Poda", type: "Labor", sortOrder: "2" }
    ];
    const agronomists = [
      { agronomistUserId: "7", engineerName: "Ana Lopez" },
      { agronomistUserId: "9", engineerName: "Luis Perez" }
    ];
    const parcels = [
      makeLatestParcel({ parcelId: "21", stageId: "1", stageName: "Brotamiento" }),
      makeLatestParcel({ parcelId: "22", stageId: "1", stageName: "Brotamiento" }),
      makeLatestParcel({
        parcelId: "23",
        agronomistUserId: "9",
        engineerName: "Luis Perez",
        stageId: null,
        stageName: null
      })
    ];
    const query = vi.fn((sql: string) => {
      if (sql.includes("FROM etapas_fenologicas e")) return Promise.resolve(stages);
      if (sql.includes("FROM usuarios u")) return Promise.resolve(agronomists);
      return Promise.resolve(parcels);
    });
    const service = new ReportesService({ query } as never);

    const result = await service.getFieldsByStageReport({});

    expect(result.summary).toMatchObject({
      totalCategorizedParcels: 2,
      uncategorizedParcels: 1,
      byStage: [
        { stageId: "1", count: 2, percentage: 100 },
        { stageId: "2", count: 0, percentage: 0 }
      ]
    });
    expect(result.summary.byEngineer).toEqual([
      {
        agronomistUserId: "7",
        engineerName: "Ana Lopez",
        totalParcels: 2,
        stages: [
          {
            stageId: "1",
            count: 2,
            percentageOfFilteredTotal: 100,
            percentageOfEngineer: 100
          },
          {
            stageId: "2",
            count: 0,
            percentageOfFilteredTotal: 0,
            percentageOfEngineer: 0
          }
        ]
      },
      {
        agronomistUserId: "9",
        engineerName: "Luis Perez",
        totalParcels: 0,
        stages: [
          {
            stageId: "1",
            count: 0,
            percentageOfFilteredTotal: 0,
            percentageOfEngineer: 0
          },
          {
            stageId: "2",
            count: 0,
            percentageOfFilteredTotal: 0,
            percentageOfEngineer: 0
          }
        ]
      }
    ]);
    expect(result.parcels).toHaveLength(2);
    expect(query.mock.calls[2]?.[0]).toContain("SELECT DISTINCT ON (v.parcela_id)");
    expect(query.mock.calls[2]?.[0]).toContain(
      "ORDER BY v.parcela_id, v.fecha_visita DESC, v.id DESC"
    );
    expect(query.mock.calls[2]?.[0]).toContain(
      "INNER JOIN usuarios u ON u.id = uv.agronomo_usuario_id AND u.activo = true"
    );
    expect(query.mock.calls[2]?.[0]).toContain("r.codigo = 'AGRONOMO'");
  });

  it("applies the engineer filter after selecting each parcel latest visit", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new ReportesService({ query } as never);

    await service.getFieldsByStageReport({
      agronomo_usuario_id: "7",
      productor_id: "15"
    });

    expect(query.mock.calls[1]?.[1]).toEqual(["7"]);
    const parcelSql = String(query.mock.calls[2]?.[0]);
    const cteEnd = parcelSql.indexOf(")\n      SELECT");
    expect(parcelSql.slice(0, cteEnd)).toContain("p.productor_id = $1");
    expect(parcelSql.slice(0, cteEnd)).not.toContain("uv.agronomo_usuario_id");
    expect(parcelSql.slice(cteEnd)).toContain("uv.agronomo_usuario_id = $2");
    expect(query.mock.calls[2]?.[1]).toEqual(["15", "7"]);
  });
});

function makeLatestParcel(
  overrides: Partial<{
    parcelId: string;
    agronomistUserId: string;
    engineerName: string;
    stageId: string | null;
    stageName: string | null;
  }> = {}
) {
  return {
    parcelId: "21",
    parcelCode: "PAR-021",
    parcelName: "El Mango",
    productorId: "15",
    productorName: "Rosa Diaz",
    agronomistUserId: "7",
    engineerName: "Ana Lopez",
    stageId: "1",
    stageName: "Brotamiento",
    geometry: null,
    parcelPoint: null,
    referencePoint: null,
    ...overrides
  };
}
