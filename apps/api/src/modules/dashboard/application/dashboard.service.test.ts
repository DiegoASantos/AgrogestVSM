import { describe, expect, it } from "vitest";

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
  it("groups frequent nutrient deficiencies by nutrient name and returns only the top three", async () => {
    const queryBuilder = createQueryBuilder([
      { nutriente: "Zinc", count: "4" },
      { nutriente: "Nitrogeno", count: "3" },
      { nutriente: "Potasio", count: "2" }
    ]);
    const dataSource = {
      createQueryBuilder: () => queryBuilder
    };
    const service = new DashboardService(dataSource as never);

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
