import { describe, expect, it } from "vitest";
import {
  formatFertilizacionDosis,
  formatFitosanidadDosis,
  getFertilizacionTotalUnit,
  getFitosanidadAggregateUnit
} from "./dose-unit-format";

describe("unidades de dosis en receta PDF", () => {
  it("uses the selected fitosanitary unit for the total per hectare", () => {
    expect(
      formatFitosanidadDosis({
        dosisProducto: 2,
        unidadDosis: "g/cilindro",
        cantidadTotalProducto: 6
      })
    ).toBe("6 g/ha");
  });

  it("keeps a readable fallback for historical fitosanitary recipes", () => {
    expect(
      formatFitosanidadDosis({
        dosisProducto: 2,
        unidadDosis: null,
        cantidadTotalProducto: null
      })
    ).toBe("2 mg o ml/cilindro");
  });

  it("prints the selected fertilizer unit unchanged", () => {
    expect(formatFertilizacionDosis({ dosis: 0.5, unidadDosis: "kg/planta" })).toBe(
      "0.5 kg/planta"
    );
  });

  it("uses a compatibility label for an entirely historical mixture", () => {
    expect(getFitosanidadAggregateUnit([null, undefined])).toBe("mg o ml/ha");
  });

  it("does not assign one unit to a mixed-unit aggregate", () => {
    expect(getFitosanidadAggregateUnit(["kg/cilindro", "ml/cilindro"])).toBe("");
  });

  it("derives a historical fertilizer total unit from its physical type", () => {
    expect(getFertilizacionTotalUnit(null, "liquido")).toBe("l");
    expect(getFertilizacionTotalUnit(null, "solido")).toBe("kg");
  });
});
