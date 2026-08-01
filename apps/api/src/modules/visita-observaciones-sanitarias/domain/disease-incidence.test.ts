import { describe, expect, it } from "vitest";

import { resolveDiseaseIncidenceGrade } from "./disease-incidence";

describe("resolveDiseaseIncidenceGrade", () => {
  it.each([
    [0, 0],
    [1, 1],
    [5, 1],
    [6, 2],
    [20, 2],
    [21, 3],
    [100, 3]
  ])("mapea %i%% al grado %i", (percentage, grade) => {
    expect(resolveDiseaseIncidenceGrade(percentage)).toBe(grade);
  });

  it.each([-1, 101, 1.5])("rechaza el porcentaje inválido %s", (percentage) => {
    expect(() => resolveDiseaseIncidenceGrade(percentage)).toThrow(RangeError);
  });
});
