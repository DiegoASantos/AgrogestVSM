import { describe, expect, it } from "vitest";

import { hasVisitRecommendations } from "./visit-recommendations";

describe("recomendaciones de visita", () => {
  it("reconoce una visita sin recomendaciones", () => {
    expect(
      hasVisitRecommendations({
        fitosanidad: false,
        fertilizacion: false,
        riego: false,
        labores: false
      })
    ).toBe(false);
  });

  it.each(["fitosanidad", "fertilizacion", "riego", "labores"] as const)(
    "reconoce recomendaciones de %s",
    (kind) => {
      expect(
        hasVisitRecommendations({
          fitosanidad: kind === "fitosanidad",
          fertilizacion: kind === "fertilizacion",
          riego: kind === "riego",
          labores: kind === "labores"
        })
      ).toBe(true);
    }
  );
});
