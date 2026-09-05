import { describe, expect, it, vi } from "vitest";

import { DashboardService } from "./dashboard.service";

type QueryCall = {
  method: string;
  args: unknown[];
};

function createQueryBuilder(rows: Array<Record<string, string | null>>) {
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
    innerJoin(...args: unknown[]) {
      calls.push({ method: "innerJoin", args });
      return builder;
    },
    leftJoin(...args: unknown[]) {
      calls.push({ method: "leftJoin", args });
      return builder;
    },
    where(...args: unknown[]) {
      calls.push({ method: "where", args });
      return builder;
    },
    setParameters(...args: unknown[]) {
      calls.push({ method: "setParameters", args });
      return builder;
    },
    andWhere(...args: unknown[]) {
      calls.push({ method: "andWhere", args });
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
    },
    getRawOne() {
      calls.push({ method: "getRawOne", args: [] });
      return Promise.resolve(rows[0]);
    }
  };

  return builder;
}

describe("DashboardService", () => {
  it("rejects days without a month and impossible calendar dates", async () => {
    const service = new DashboardService({} as never, {} as never);

    await expect(service.getResumen({ year: 2026, day: 5 })).rejects.toThrow(
      "day requires month."
    );
    await expect(
      service.getResumen({ year: 2026, month: 2, day: 30 })
    ).rejects.toThrow("day is not valid for the selected year and month.");
  });

  it("breaks down visits by day when a month is selected", async () => {
    const queryBuilder = createQueryBuilder([
      { mes: "2026-08-05", count: "2" },
      { mes: "2026-08-12", count: "1" }
    ]);
    const service = new DashboardService(
      { createQueryBuilder: () => queryBuilder } as never,
      {} as never
    );

    const result = await (
      service as unknown as {
        getVisitasPorMes: (period: { year: number; month: number }) => Promise<
          Array<{ mes: string; count: number }>
        >;
      }
    ).getVisitasPorMes({ year: 2026, month: 8 });

    expect(queryBuilder.calls).toContainEqual({
      method: "select",
      args: ["TO_CHAR(v.fecha_visita, 'YYYY-MM-DD')", "mes"]
    });
    expect(result).toHaveLength(31);
    expect(result[4]).toEqual({ mes: "2026-08-05", count: 2 });
    expect(result[11]).toEqual({ mes: "2026-08-12", count: 1 });
    expect(result[0]).toEqual({ mes: "2026-08-01", count: 0 });
  });

  it("rejects an inverted date range before querying dashboard metrics", async () => {
    const service = new DashboardService({} as never, {} as never);

    await expect(
      service.getVisitasPorAgronomo({
        fecha_desde: "2026-08-31",
        fecha_hasta: "2026-08-01"
      })
    ).rejects.toThrow("fecha_hasta must be greater than or equal to fecha_desde.");
  });

  it("passes the visit filters as a single SQL condition for agronomist metrics", async () => {
    const where = vi.fn();
    const addOrderBy = vi.fn();
    const builder = {
      select: () => builder,
      addSelect: () => builder,
      from: () => builder,
      leftJoin: () => builder,
      where: (...args: unknown[]) => {
        where(...args);
        return builder;
      },
      setParameters: () => builder,
      groupBy: () => builder,
      addGroupBy: () => builder,
      orderBy: () => builder,
      addOrderBy: (...args: unknown[]) => {
        addOrderBy(...args);
        return builder;
      },
      getRawMany: () =>
        Promise.resolve([
          { agronomistUserId: "7", agronomistName: "Ana Lopez", count: "2" }
        ])
    };
    const service = new DashboardService(
      { createQueryBuilder: () => builder } as never,
      {} as never
    );

    const result = await service.getVisitasPorAgronomo({
      fecha_desde: "2026-08-01",
      fecha_hasta: "2026-08-24"
    });

    expect(where).toHaveBeenCalledWith(
      "v.activo = true AND v.fecha_visita >= :startDate AND v.fecha_visita <= :endDate"
    );
    expect(addOrderBy).toHaveBeenCalledWith('"agronomistName"', "ASC");
    expect(result.items).toEqual([
      { agronomistUserId: "7", agronomistName: "Ana Lopez", count: 2 }
    ]);
  });

  it("groups parcels returned from their latest visits by phenological stage", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        etapaFenologicaId: "1",
        name: "Floración",
        type: "Etapa",
        productor: "Lopez Ana"
      },
      {
        etapaFenologicaId: "1",
        name: "Floración",
        type: "Etapa",
        productor: "Perez Juan"
      }
    ]);
    const service = new DashboardService({ query } as never, {} as never);

    const result = await service.getParcelasPorEtapa({
      fecha_desde: "2026-08-01",
      fecha_hasta: "2026-08-24"
    });

    expect(query.mock.calls[0]?.[0]).toContain("DISTINCT ON (v.parcela_id)");
    expect(query.mock.calls[0]?.[1]).toEqual(["2026-08-01", "2026-08-24"]);
    expect(result.items).toEqual([
      {
        etapaFenologicaId: "1",
        name: "Floración",
        type: "Etapa",
        count: 2,
        productores: ["Lopez Ana", "Perez Juan"]
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
        getDeficienciasNutrientes: (period: { year: number }) => Promise<
          Array<{ nutriente: string; count: number }>
        >;
      }
    ).getDeficienciasNutrientes({ year: 2026 });

    const selectCall = queryBuilder.calls.find((call) => call.method === "select");
    const groupByCall = queryBuilder.calls.find((call) => call.method === "groupBy");
    const limitCall = queryBuilder.calls.find((call) => call.method === "limit");
    const visitJoin = queryBuilder.calls.find((call) => call.method === "innerJoin");
    const activeFilter = queryBuilder.calls.find((call) => call.method === "where");

    expect(selectCall?.args[0]).toContain("regexp_replace");
    expect(groupByCall?.args[0]).toBe(selectCall?.args[0]);
    expect(groupByCall?.args[0]).not.toBe("ve.descripcion");
    expect(limitCall?.args).toEqual([3]);
    expect(visitJoin?.args).toEqual(["visitas_campo", "v", "v.id = ve.visita_id"]);
    expect(String(activeFilter?.args[0])).toContain("v.activo = true");
    expect(activeFilter?.args[1]).toMatchObject({ dashboardYear: 2026 });
    expect(result).toEqual([
      { nutriente: "Zinc", count: 4 },
      { nutriente: "Nitrogeno", count: 3 },
      { nutriente: "Potasio", count: 2 }
    ]);
  });

  it("excludes inactive visits from pest charts and recent recipes", async () => {
    const pestBuilder = createQueryBuilder([]);
    const recipeBuilder = createQueryBuilder([]);
    const dataSource = {
      createQueryBuilder: vi
        .fn()
        .mockReturnValueOnce(pestBuilder)
        .mockReturnValueOnce(recipeBuilder)
    };
    const service = new DashboardService(dataSource as never, {} as never);
    const privateService = service as unknown as {
      getPlagasFrecuentes: (period: { year: number }) => Promise<unknown>;
      getUltimasRecetas: () => Promise<unknown>;
    };

    await privateService.getPlagasFrecuentes({ year: 2026 });
    await privateService.getUltimasRecetas();

    expect(pestBuilder.calls).toContainEqual({
      method: "where",
      args: [expect.stringContaining("v.activo = true"), expect.any(Object)]
    });
    expect(recipeBuilder.calls).toContainEqual({
      method: "where",
      args: ["v.activo = true"]
    });
  });

  it("filters frequent diseases by the selected year, month and day", async () => {
    const queryBuilder = createQueryBuilder([{ enfermedad: "Antracnosis", count: "2" }]);
    const service = new DashboardService(
      { createQueryBuilder: () => queryBuilder } as never,
      {} as never
    );

    const result = await (
      service as unknown as {
        getEnfermedadesFrecuentes: (period: {
          year: number;
          month: number;
          day: number;
        }) => Promise<Array<{ enfermedad: string; count: number }>>;
      }
    ).getEnfermedadesFrecuentes({ year: 2026, month: 9, day: 5 });

    const where = queryBuilder.calls.find((call) => call.method === "where");
    expect(String(where?.args[0])).toContain("pe.tipo = :tipo");
    expect(String(where?.args[0])).toContain("EXTRACT(MONTH FROM v.fecha_visita)");
    expect(where?.args[1]).toMatchObject({
      tipo: "enfermedad",
      dashboardYear: 2026,
      dashboardMonth: 9,
      dashboardDay: 5
    });
    expect(result).toEqual([{ enfermedad: "Antracnosis", count: 2 }]);
  });

  it("excludes inactive visits from recipe and compliance KPIs", async () => {
    const builders = [
      createQueryBuilder([{ count: "0" }]),
      createQueryBuilder([{ count: "0" }]),
      createQueryBuilder([{ count: "0" }]),
      createQueryBuilder([{ count: "0" }]),
      createQueryBuilder([{ score: null }])
    ];
    let builderIndex = 0;
    const dataSource = {
      createQueryBuilder: () => builders[builderIndex++]
    };
    const service = new DashboardService(dataSource as never, {} as never);

    await (
      service as unknown as {
        getKpis: () => Promise<unknown>;
      }
    ).getKpis();

    for (const builder of builders.slice(3)) {
      expect(builder.calls).toContainEqual({
        method: "where",
        args: ["v.activo = true"]
      });
      expect(builder.calls.some((call) => call.method === "innerJoin")).toBe(true);
    }
  });
});
