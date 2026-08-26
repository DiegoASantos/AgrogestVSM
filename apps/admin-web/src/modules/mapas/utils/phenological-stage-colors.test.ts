import { describe, expect, it } from "vitest";

import { buildPhenologicalStageColorLookup } from "./phenological-stage-colors";

describe("buildPhenologicalStageColorLookup", () => {
  it("should assign stable, distinct colors to the ordered stage catalog", () => {
    const stages = [
      { id: "stage-1", name: "Floracion", sortOrder: 1, type: "Etapa" as const, isActive: true },
      { id: "labor-1", name: "Poda", sortOrder: 2, type: "Labor" as const, isActive: true }
    ];

    const colors = buildPhenologicalStageColorLookup(stages);

    expect(colors.get("stage-1")).toBe("#0072b2");
    expect(colors.get("labor-1")).toBe("#d55e00");
  });
});
