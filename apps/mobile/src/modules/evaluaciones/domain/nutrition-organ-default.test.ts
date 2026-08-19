import { describe, expect, it } from "vitest";

import { resolveNutritionOrganos } from "./nutrition-organ-default";

describe("resolveNutritionOrganos", () => {
  it.each(["0", "1", "100"])(
    "asigna hoja tierna cuando la incidencia %s no tiene organo",
    (incidencePercentage) => {
      expect(resolveNutritionOrganos(incidencePercentage, [])).toEqual(["hoja_tierna"]);
    }
  );

  it("conserva organos historicos", () => {
    expect(resolveNutritionOrganos("10", ["raices"])).toEqual(["raices"]);
  });

  it("limpia organos al borrar la incidencia", () => {
    expect(resolveNutritionOrganos("", ["hoja_tierna"])).toEqual([]);
  });
});
