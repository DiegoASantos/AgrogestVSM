import { describe, expect, it } from "vitest";

import {
  PRUNING_RECOMMENDATIONS,
  toggleLaborRecommendation
} from "./visita-receta-labores";

describe("recomendaciones de labores culturales", () => {
  it("declara exactamente los cuatro tipos de poda acordados", () => {
    expect(PRUNING_RECOMMENDATIONS).toEqual([
      "poda_formacion",
      "poda_saneamiento",
      "poda_aclareo_iluminacion",
      "poda_rejuvenecimiento_severa"
    ]);
  });

  it("reemplaza una poda sin alterar otras labores", () => {
    const selected = new Set(["horqueteo", "poda_formacion"]);

    expect(toggleLaborRecommendation(selected, "poda_saneamiento")).toEqual(
      new Set(["horqueteo", "poda_saneamiento"])
    );
  });

  it("permite quitar la poda activa", () => {
    expect(
      toggleLaborRecommendation(
        new Set(["limpieza_maleza_motoguadana", "poda_aclareo_iluminacion"]),
        "poda_aclareo_iluminacion"
      )
    ).toEqual(new Set(["limpieza_maleza_motoguadana"]));
  });

  it("mantiene seleccion multiple para las labores no relacionadas", () => {
    expect(toggleLaborRecommendation(new Set(["horqueteo"]), "enzunchado")).toEqual(
      new Set(["horqueteo", "enzunchado"])
    );
  });
});
