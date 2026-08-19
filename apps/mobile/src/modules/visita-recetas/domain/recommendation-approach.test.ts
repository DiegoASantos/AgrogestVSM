import { describe, expect, it } from "vitest";

import {
  formatRecommendationApproach,
  normalizeRecommendationApproach
} from "./recommendation-approach";

describe("recommendation approach", () => {
  it("mantiene el valor historico y lo presenta como curativo", () => {
    expect(normalizeRecommendationApproach(undefined)).toBe("reactivo");
    expect(formatRecommendationApproach(null)).toBe("Curativo");
  });

  it("identifies preventive phytosanitary recommendations with grade zero", () => {
    expect(formatRecommendationApproach("preventivo", true)).toBe(
      "Preventivo · Incidencia grado 0 · Severidad grado 0"
    );
  });

  it("identifies preventive fertilizer without inventing a deficiency", () => {
    expect(formatRecommendationApproach("preventivo")).toBe("Preventivo");
  });
});
