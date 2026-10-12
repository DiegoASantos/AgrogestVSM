import { describe, expect, it } from "vitest";

import { shouldPersistVisitRecipe } from "./should-persist-visit-recipe";

describe("persistencia de receta de visita", () => {
  it("omite crear un agregado cuando no hay recomendaciones ni receta previa", () => {
    expect(shouldPersistVisitRecipe(false, false)).toBe(false);
  });

  it("conserva el guardado si hay recomendaciones o una receta previa", () => {
    expect(shouldPersistVisitRecipe(true, false)).toBe(true);
    expect(shouldPersistVisitRecipe(false, true)).toBe(true);
  });
});
