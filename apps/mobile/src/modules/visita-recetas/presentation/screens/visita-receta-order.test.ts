import { describe, expect, it } from "vitest";

import {
  generateOrdenMezcla,
  isOrdenMezclaFixedItem,
  swapOrdenMezclaItems
} from "./visita-receta-order";

describe("visita receta orden de mezcla", () => {
  it("genera el orden automatico desde los coadyuvantes seleccionados", () => {
    expect(
      generateOrdenMezcla(["Antiespumante", "Corrector de pH", "Adherente"])
    ).toEqual(["Agua", "Corrector de pH", "Producto agroquimico", "Adherente", "Antiespumante"]);
  });

  it("intercambia dos posiciones sin mutar el orden original", () => {
    const orden = ["Agua", "Producto agroquimico", "Adherente", "Antideriva"];

    expect(swapOrdenMezclaItems(orden, 2, 3)).toEqual([
      "Agua",
      "Producto agroquimico",
      "Antideriva",
      "Adherente"
    ]);
    expect(orden).toEqual(["Agua", "Producto agroquimico", "Adherente", "Antideriva"]);
  });

  it("mantiene el orden manual cuando no hay un intercambio valido", () => {
    const orden = ["Agua", "Producto agroquimico", "Antideriva", "Adherente"];

    expect(swapOrdenMezclaItems(orden, 2, 2)).toBe(orden);
    expect(swapOrdenMezclaItems(orden, 2, 9)).toBe(orden);
  });

  it("identifica los elementos fijos que no son intercambiables", () => {
    expect(isOrdenMezclaFixedItem("Agua")).toBe(true);
    expect(isOrdenMezclaFixedItem("Corrector de pH")).toBe(true);
    expect(isOrdenMezclaFixedItem("Producto agroquimico")).toBe(true);
    expect(isOrdenMezclaFixedItem("Adherente")).toBe(false);
  });
});
