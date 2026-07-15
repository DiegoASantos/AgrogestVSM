import { describe, expect, it } from "vitest";

import { getDefaultLaborSelectionIds } from "./labor-cultural-defaults";

describe("labor cultural defaults", () => {
  it("selecciona la opcion inicial de cada una de las seis categorias", () => {
    const defaults = getDefaultLaborSelectionIds([
      makeItem("maleza-limpio", "weed_infestation", "clean"),
      makeItem("maleza-alto", "weed_infestation", "high"),
      makeItem("suelo-limpio", "soil_sanitary_status", "clean"),
      makeItem("ramas-bajo", "unproductive_branch_density", "low"),
      makeItem("quiebre-bajo", "branch_break_risk", "low"),
      makeItem("copa-buena", "canopy_status", "good"),
      makeItem("carga-equilibrado", "load_balance", "balanced")
    ]);

    expect([...defaults]).toEqual([
      "maleza-limpio", "suelo-limpio", "ramas-bajo", "quiebre-bajo", "copa-buena", "carga-equilibrado"
    ]);
  });
});

function makeItem(id: string, categoryCode: string, optionCode: string) {
  return { id, name: id, description: null, categoryCode, categoryName: categoryCode, optionCode, optionLabel: optionCode, legend: null, sortOrder: null, isActive: true };
}