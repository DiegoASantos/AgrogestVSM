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

    expect(steps.map((step) => step.id)).toEqual([
      "fitosanidad",
      "fertilizacion",
      "riego",
      "labores",
      "continue"
    ]);
    expect(getNextTutorialStep(steps, "fitosanidad")?.id).toBe("fertilizacion");
  });

  it("incluye la configuracion de mezcla solo si hay productos", () => {
    expect(buildMixtureTutorialSteps(true).map((step) => step.id)).toContain("products");
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
