import { describe, expect, it } from "vitest";

import type { IngredienteActivoCatalogItem, MarcaProductoCatalogItem } from "../../types";
import {
  buildIngredientSelectionPatch,
  buildTypeSelectionPatch,
  getCommercialOptions,
  getIngredientOptions,
  resolveIngredientId
} from "./visita-receta-selection";

const ingredients: IngredienteActivoCatalogItem[] = [
  { id: "ia-1", name: "Abamectina", description: null },
  { id: "ia-2", name: "Azufre", description: null },
  { id: "ia-3", name: "Cobre", description: null }
];

const brands: MarcaProductoCatalogItem[] = [
  {
    id: "brand-1",
    name: "Abamex",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-1",
    ingredienteActivoNombre: "Abamectina",
    concentracion: 18
  },
  {
    id: "brand-2",
    name: "Aba Plus",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-1",
    ingredienteActivoNombre: "Abamectina",
    concentracion: 20
  },
  {
    id: "brand-3",
    name: "Azufre 80",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-2",
    ingredienteActivoNombre: "Azufre",
    concentracion: 80
  },
  {
    id: "brand-4",
    name: "Cobre Solo",
    tipoProductoId: "type-2",
    ingredienteActivoId: "ia-3",
    ingredienteActivoNombre: "Cobre",
    concentracion: 50
  }
];

describe("recipe catalog selection cascade", () => {
  it("filters ingredients by product type and commercial names by ingredient", () => {
    expect(
      getIngredientOptions("type-1", ingredients, brands).map((item) => item.id)
    ).toEqual(["ia-1", "ia-2"]);
    expect(getCommercialOptions("type-1", "ia-1", brands).map((item) => item.id)).toEqual(
      ["brand-1", "brand-2"]
    );
  });

  it("clears dependent values when a type has multiple ingredients", () => {
    expect(buildTypeSelectionPatch("type-1", ingredients, brands)).toEqual({
      tipoProductoId: "type-1",
      ingredienteActivoId: "",
      ingredienteActivoNombre: "",
      marcaProductoNombre: "",
      concentracionProducto: ""
    });
  });

  it("auto-selects the only ingredient and commercial name", () => {
    expect(buildTypeSelectionPatch("type-2", ingredients, brands)).toEqual({
      tipoProductoId: "type-2",
      ingredienteActivoId: "ia-3",
      ingredienteActivoNombre: "Cobre",
      marcaProductoNombre: "Cobre Solo",
      concentracionProducto: "50"
    });
  });

  it("keeps the commercial selection empty when an ingredient has multiple names", () => {
    expect(buildIngredientSelectionPatch("type-1", "ia-1", ingredients, brands)).toEqual({
      ingredienteActivoId: "ia-1",
      ingredienteActivoNombre: "Abamectina",
      marcaProductoNombre: "",
      concentracionProducto: ""
    });
  });

  it("restores the transient ingredient id from persisted text", () => {
    expect(
      resolveIngredientId("type-1", "Abamectina", "Abamex", ingredients, brands)
    ).toBe("ia-1");
    expect(
      resolveIngredientId("type-1", "Historico", "Producto antiguo", ingredients, brands)
    ).toBe("");
  });
});
