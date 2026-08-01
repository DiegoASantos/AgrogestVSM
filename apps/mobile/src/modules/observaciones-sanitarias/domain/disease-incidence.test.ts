import { describe, expect, it } from "vitest";

import {
  resolveDiseaseIncidenceDescription,
  resolveDiseaseIncidenceGrade
} from "./disease-incidence";

describe("resolveDiseaseIncidenceGrade", () => {
  it.each([
    [0, 0],
    [1, 1],
    [5, 1],
    [6, 2],
    [20, 2],
    [21, 3],
    [100, 3]
  ])("mapea %i%% al grado %i", (percentage, expectedGrade) => {
    expect(resolveDiseaseIncidenceGrade(percentage)).toBe(expectedGrade);
  });

  it.each([-1, 101, 1.5])("rechaza el porcentaje inválido %s", (percentage) => {
    expect(() => resolveDiseaseIncidenceGrade(percentage)).toThrow(RangeError);
  });

  it("expone la descripción del grado derivado aunque falte la relación de etapa", () => {
    expect(resolveDiseaseIncidenceDescription(2)).toBe(
      "Más de 5% y hasta 20% de árboles enfermos."
    );
  });
});
