import { describe, expect, it } from "vitest";

import { resolveNutritionIncidence } from "./nutrition-incidence";

describe("resolveNutritionIncidence", () => {
  it.each([
    [0, 0],
    [1, 1],
    [5, 1],
    [6, 2],
    [20, 2],
    [21, 3],
    [100, 3]
  ] as const)("mapea %i%% al grado %i", (percentage, grade) => {
    expect(resolveNutritionIncidence(percentage).grade).toBe(grade);
  });

  it.each([-1, 101, 1.5])("rechaza el valor %s", (percentage) => {
    expect(() => resolveNutritionIncidence(percentage)).toThrow();
  });
});
