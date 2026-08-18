import { describe, expect, it } from "vitest";

import type { IngredienteActivoCatalogItem, MarcaProductoCatalogItem } from "../../types";
import {
  buildCommercialSelectionPatch,
  buildIngredientSelectionPatch,
  buildTypeSelectionPatch,
  getCommercialOptions,
  getIngredientOptions,
  resolveCommercialSelectionPatch,
  resolveIngredientId
} from "./visita-receta-selection";

const ingredients: IngredienteActivoCatalogItem[] = [
  { id: "ia-1", publicId: "ia-1", name: "Abamectina", description: null },
  { id: "ia-2", publicId: "ia-2", name: "Azufre", description: null },
  { id: "ia-3", publicId: "ia-3", name: "Cobre", description: null }
];

const brands: MarcaProductoCatalogItem[] = [
  {
    id: "brand-1",
    publicId: "brand-1",
    name: "Abamex",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-1",
    ingredienteActivoNombre: "Abamectina",
    concentracion: 18,
    concentracionTexto: "18",
    unidadMedida: "g/L"
  },
  {
    id: "brand-2",
    publicId: "brand-2",
    name: "Aba Plus",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-1",
    ingredienteActivoNombre: "Abamectina",
    concentracion: 20,
    concentracionTexto: "20",
    unidadMedida: "g/L"
  },
  {
    id: "brand-3",
    publicId: "brand-3",
    name: "Azufre 80",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-2",
    ingredienteActivoNombre: "Azufre",
    concentracion: 80,
    concentracionTexto: "80",
    unidadMedida: "%"
  },
  {
    id: "brand-4",
    publicId: "brand-4",
    name: "Cobre Solo",
    tipoProductoId: "type-2",
    ingredienteActivoId: "ia-3",
    ingredienteActivoNombre: "Cobre",
    concentracion: 50,
    concentracionTexto: "50",
    unidadMedida: "g/Kg"
  },
  {
    id: "brand-without-ingredient",
    publicId: "brand-without-ingredient",
    name: "Marca historica",
    tipoProductoId: "type-1",
    ingredienteActivoId: null,
    ingredienteActivoNombre: null,
    concentracion: 10,
    concentracionTexto: "10",
    unidadMedida: "%"
  },
  {
    id: "brand-with-missing-ingredient",
    publicId: "brand-with-missing-ingredient",
    name: "Marca huerfana",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-missing",
    ingredienteActivoNombre: "Ingrediente inexistente",
    concentracion: 12,
    concentracionTexto: "12",
    unidadMedida: "%"
  }
];

describe("recipe catalog selection cascade", () => {
  it("filters ingredients by product type and commercial names by ingredient", () => {
    expect(
      getIngredientOptions("type-1", ingredients, brands).map((item) => item.id)
    ).toEqual(["ia-1", "ia-2"]);
    expect(
      getCommercialOptions("type-1", "ia-1", ingredients, brands).map((item) => item.id)
    ).toEqual(["brand-1", "brand-2"]);
  });

  it("lists all valid commercial names for a type before choosing an ingredient", () => {
    expect(
      getCommercialOptions("type-1", "", ingredients, brands).map((item) => item.id)
    ).toEqual(["brand-1", "brand-2", "brand-3"]);
  });

  it("clears dependent values when a type has multiple ingredients", () => {
    expect(buildTypeSelectionPatch("type-1", ingredients, brands)).toEqual({
      tipoProductoId: "type-1",
      ingredienteActivoId: "",
      ingredienteActivoNombre: "",
      marcaProductoNombre: "",
      concentracionProducto: "",
      unidadMedidaProducto: ""
    });
  });

  it("auto-selects the only ingredient and commercial name", () => {
    expect(buildTypeSelectionPatch("type-2", ingredients, brands)).toEqual({
      tipoProductoId: "type-2",
      ingredienteActivoId: "ia-3",
      ingredienteActivoNombre: "Cobre",
      marcaProductoNombre: "Cobre Solo",
      concentracionProducto: "50",
      unidadMedidaProducto: "g/Kg"
    });
  });

  it("keeps the commercial selection empty when an ingredient has multiple names", () => {
    expect(buildIngredientSelectionPatch("type-1", "ia-1", ingredients, brands)).toEqual({
      ingredienteActivoId: "ia-1",
      ingredienteActivoNombre: "Abamectina",
      marcaProductoNombre: "",
      concentracionProducto: "",
      unidadMedidaProducto: ""
    });
  });

  it("clears an incompatible brand and auto-selects the only compatible one", () => {
    expect(buildIngredientSelectionPatch("type-1", "ia-2", ingredients, brands)).toEqual({
      ingredienteActivoId: "ia-2",
      ingredienteActivoNombre: "Azufre",
      marcaProductoNombre: "Azufre 80",
      concentracionProducto: "80",
      unidadMedidaProducto: "%"
    });
  });

  it("selects the ingredient, commercial name, concentration and unit from a brand", () => {
    expect(buildCommercialSelectionPatch(brands[2]!, ingredients)).toEqual({
      ingredienteActivoId: "ia-2",
      ingredienteActivoNombre: "Azufre",
      marcaProductoNombre: "Azufre 80",
      concentracionProducto: "80",
      unidadMedidaProducto: "%"
    });
    expect(buildCommercialSelectionPatch(brands[5]!, ingredients)).toBeNull();
  });

  it("restores the transient ingredient id from persisted text", () => {
    expect(
      resolveIngredientId("type-1", "Abamectina", "Abamex", ingredients, brands)
    ).toBe("ia-1");
    expect(
      resolveIngredientId("type-1", "Historico", "Producto antiguo", ingredients, brands)
    ).toBe("");
  });

  it("rehydrates concentration and unit after a catalog refresh", () => {
    expect(
      resolveCommercialSelectionPatch("type-2", " cobre solo ", ingredients, brands)
    ).toEqual({
      ingredienteActivoId: "ia-3",
      ingredienteActivoNombre: "Cobre",
      marcaProductoNombre: "Cobre Solo",
      concentracionProducto: "50",
      unidadMedidaProducto: "g/Kg"
    });
    expect(
      resolveCommercialSelectionPatch("type-1", "Producto ausente", ingredients, brands)
    ).toBeNull();
  });
});
