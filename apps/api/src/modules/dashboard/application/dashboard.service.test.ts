import { describe, expect, it, vi } from "vitest";

import { DashboardService } from "./dashboard.service";

type QueryCall = {
  method: string;
  args: unknown[];
};

function createQueryBuilder(rows: Array<{ nutriente: string; count: string }>) {
  const calls: QueryCall[] = [];

  const builder = {
    calls,
    select(...args: unknown[]) {
      calls.push({ method: "select", args });
      return builder;
    },
    addSelect(...args: unknown[]) {
      calls.push({ method: "addSelect", args });
      return builder;
    },
    from(...args: unknown[]) {
      calls.push({ method: "from", args });
      return builder;
    },
    where(...args: unknown[]) {
      calls.push({ method: "where", args });
      return builder;
    },
    groupBy(...args: unknown[]) {
      calls.push({ method: "groupBy", args });
      return builder;
    },
    orderBy(...args: unknown[]) {
      calls.push({ method: "orderBy", args });
      return builder;
    },
    limit(...args: unknown[]) {
      calls.push({ method: "limit", args });
      return builder;
    },
    getRawMany() {
      calls.push({ method: "getRawMany", args: [] });
      return Promise.resolve(rows);
    }
  };

  return builder;
}

describe("DashboardService", () => {
  it("rejects an inverted date range before querying dashboard metrics", async () => {
    const service = new DashboardService({} as never, {} as never);

    await expect(
      service.getVisitasPorAgronomo({
        fecha_desde: "2026-08-31",
        fecha_hasta: "2026-08-01"
      })
    ).rejects.toThrow("fecha_hasta must be greater than or equal to fecha_desde.");
  });

  it("groups parcels returned from their latest visits by phenological stage", async () => {
    const catalogBuilder = createMetricQueryBuilder([
      { id: "1", name: "Floración", type: "Etapa" },
      { id: "2", name: "Poda", type: "Labor" }
    ]);
    const query = vi.fn().mockResolvedValue([
      {
        etapaFenologicaId: "1",
        name: "Floración",
        type: "Etapa",
        parcela: "P-01 - Norte"
      },
      { etapaFenologicaId: "1", name: "Floración", type: "Etapa", parcela: "P-02 - Sur" }
    ]);
    const service = new DashboardService(
      { createQueryBuilder: () => catalogBuilder, query } as never,
      {} as never
    );

    const result = await service.getParcelasPorEtapa({
      fecha_desde: "2026-08-01",
      fecha_hasta: "2026-08-24",
      etapa_fenologica_id: "1"
    });

    expect(query.mock.calls[0]?.[0]).toContain("DISTINCT ON (v.parcela_id)");
    expect(query.mock.calls[0]?.[0]).toContain("e.activo = true AND e.id = $3");
    expect(query.mock.calls[0]?.[1]).toEqual(["2026-08-01", "2026-08-24", "1"]);
    expect(result.etapas).toHaveLength(2);
    expect(result.items).toEqual([
      {
        etapaFenologicaId: "1",
        name: "Floración",
        type: "Etapa",
        count: 2,
        parcelas: ["P-01 - Norte", "P-02 - Sur"]
      }
    ]);
  });

  it("groups frequent nutrient deficiencies by nutrient name and returns only the top three", async () => {
    const queryBuilder = createQueryBuilder([
      { nutriente: "Zinc", count: "4" },
      { nutriente: "Nitrogeno", count: "3" },
      { nutriente: "Potasio", count: "2" }
    ]);
    const dataSource = {
      createQueryBuilder: () => queryBuilder
    };
    const service = new DashboardService(dataSource as never, {} as never);

    const result = await (
      service as unknown as {
        getDeficienciasNutrientes: () => Promise<
          Array<{ nutriente: string; count: number }>
        >;
      }
    ).getDeficienciasNutrientes();

    const selectCall = queryBuilder.calls.find((call) => call.method === "select");
    const groupByCall = queryBuilder.calls.find((call) => call.method === "groupBy");
    const limitCall = queryBuilder.calls.find((call) => call.method === "limit");

    expect(selectCall?.args[0]).toContain("regexp_replace");
    expect(groupByCall?.args[0]).toBe(selectCall?.args[0]);
    expect(groupByCall?.args[0]).not.toBe("ve.descripcion");
    expect(limitCall?.args).toEqual([3]);
    expect(result).toEqual([
      { nutriente: "Zinc", count: 4 },
      { nutriente: "Nitrogeno", count: 3 },
      { nutriente: "Potasio", count: 2 }
    ]);
  });
});

function createMetricQueryBuilder(rows: unknown[]) {
  const builder = {
    select: () => builder,
    addSelect: () => builder,
    from: () => builder,
    where: () => builder,
    orderBy: () => builder,
    addOrderBy: () => builder,
    getRawMany: () => Promise.resolve(rows)
  };

  return builder;
}
