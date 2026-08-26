import { describe, expect, it } from "vitest";

import {
  buildMixtureTutorialSteps,
  buildRecipeTutorialSteps,
  getNextTutorialStep,
  takePreviousTutorialStep
} from "./recipe-tutorial";

describe("tutorial de receta y mezclas", () => {
  it("recorre las secciones de receta en el orden de trabajo", () => {
    const steps = buildRecipeTutorialSteps();

    expect(steps.map((step) => step.id)).toEqual(
      expect.arrayContaining([
        "fitosanidad",
        "fitoControl",
        "fitoIngredient",
        "fitoBrand",
        "fitoAction",
        "fitoDose",
        "fitoUnit",
        "fertilizacion",
        "fertilizationRoute",
        "fertilizer",
        "fertilizerDose",
        "fertilizerAmount",
        "riego",
        "labores",
        "continue"
      ])
    );
    expect(getNextTutorialStep(steps, "fitosanidad")?.id).toBe("fitoControl");
  });

  it("incluye la configuracion de mezcla solo si hay productos", () => {
    expect(buildMixtureTutorialSteps(true).map((step) => step.id)).toEqual(
      expect.arrayContaining([
        "products",
        "productDose",
        "productPlants",
        "applicationVolume",
        "coadyuvants",
        "coadyuvantDose",
        "preparationOrder",
        "reorder",
        "nextMixture"
      ])
    );
    expect(buildMixtureTutorialSteps(false).map((step) => step.id)).toEqual([
      "endTime",
      "finish"
    ]);
  });

  it("permite volver por el recorrido ya visitado", () => {
    expect(takePreviousTutorialStep(["products", "frequency"])).toEqual({
      previousId: "frequency",
      remainingHistory: ["products"]
    });
  });
});
