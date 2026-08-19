import { describe, expect, it } from "vitest";

import {
  findFirstLaborCategoryWithoutSelection,
  findNextLaborCategoryWithoutSelection,
  type LaborAccordionGroup
} from "./labor-cultural-accordion";

const groups: LaborAccordionGroup[] = [
  { categoryCode: "maleza", itemIds: ["m1", "m2"] },
  { categoryCode: "ramas", itemIds: ["r1", "r2"] },
  { categoryCode: "frutos", itemIds: ["f1", "f2"] }
];

describe("acordeon guiado de labores culturales", () => {
  it("abre primero la primera categoria sin registros", () => {
    expect(findFirstLaborCategoryWithoutSelection(groups, new Set(["m1"]))).toBe("ramas");
  });

  it("avanza a la siguiente categoria sin registros", () => {
    expect(
      findNextLaborCategoryWithoutSelection(groups, new Set(["m1", "r2"]), "ramas")
    ).toBe("frutos");
  });

  it("vuelve a una categoria anterior si sigue sin registros", () => {
    expect(findNextLaborCategoryWithoutSelection(groups, new Set(["f1"]), "frutos")).toBe(
      "maleza"
    );
  });

  it("cierra todas las categorias cuando cada una tiene seleccion", () => {
    expect(
      findNextLaborCategoryWithoutSelection(groups, new Set(["m1", "r1", "f1"]), "frutos")
    ).toBeNull();
  });
});
