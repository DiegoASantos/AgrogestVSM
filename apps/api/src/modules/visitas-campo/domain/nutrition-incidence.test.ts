import { describe, expect, it } from "vitest";

import { resolveNutritionIncidenceGrade } from "./nutrition-incidence";

describe("resolveNutritionIncidenceGrade", () => {
  it.each([
    [0, 0],
    [1, 1],
    [5, 1],
    [6, 2],
    [20, 2],
    [21, 3],
    [100, 3]
  ])("mapea %i%% al grado %i", (percentage, grade) => {
    expect(resolveNutritionIncidenceGrade(percentage)).toBe(grade);
  });

  it.each([-1, 101, 1.5])("rechaza %s", (percentage) => {
    expect(() => resolveNutritionIncidenceGrade(percentage)).toThrow(RangeError);
  });
});
