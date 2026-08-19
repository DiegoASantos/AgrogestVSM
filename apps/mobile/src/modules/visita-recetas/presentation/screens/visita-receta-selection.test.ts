import { describe, expect, it } from "vitest";

import type { IngredienteActivoCatalogItem, MarcaProductoCatalogItem } from "../../types";
import {
  buildCommercialSelectionPatch,
  buildIngredientSelectionPatch,
  getCommercialOptions,
  getIngredientOptions,
  resolveCommercialSelectionPatch,
  resolveIngredientId
} from "./visita-receta-selection";

const ingredients: IngredienteActivoCatalogItem[] = [
  { id: "ia-1", publicId: "ia-1", name: "Abamectina", description: null },
  { id: "ia-2", publicId: "ia-2", name: "Azufre", description: null },
  { id: "ia-3", publicId: "ia-3", name: "Cobre", description: null },
  { id: "ia-4", publicId: "ia-4", name: "Sin marca", description: null }
];

const productTypes = [
  { id: "type-1", name: "Insecticida" },
  { id: "type-2", name: "Fungicida" }
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
    id: "brand-duplicate-type-1",
    publicId: "brand-duplicate-type-1",
    name: "Producto Dual",
    tipoProductoId: "type-1",
    ingredienteActivoId: "ia-1",
    ingredienteActivoNombre: "Abamectina",
    concentracion: 15,
    concentracionTexto: "15",
    unidadMedida: "%"
  },
  {
    id: "brand-duplicate-type-2",
    publicId: "brand-duplicate-type-2",
    name: "Producto Dual",
    tipoProductoId: "type-2",
    ingredienteActivoId: "ia-3",
    ingredienteActivoNombre: "Cobre",
    concentracion: 25,
    concentracionTexto: "25",
    unidadMedida: "%"
  },
  {
    id: "brand-without-type",
    publicId: "brand-without-type",
    name: "Marca sin tipo",
    tipoProductoId: null,
    ingredienteActivoId: "ia-2",
    ingredienteActivoNombre: "Azufre",
    concentracion: 30,
    concentracionTexto: "30",
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
  it("lists only ingredients related to a valid commercial name", () => {
    expect(
      getIngredientOptions(ingredients, brands, productTypes).map((item) => item.id)
    ).toEqual(["ia-1", "ia-2", "ia-3"]);
    expect(
      getCommercialOptions("ia-1", ingredients, brands, productTypes).map(
        (item) => item.id
      )
    ).toEqual(["brand-1", "brand-2", "brand-duplicate-type-1"]);
  });

  it("lists all valid commercial names before choosing an ingredient", () => {
    expect(
      getCommercialOptions("", ingredients, brands, productTypes).map((item) => item.id)
    ).toEqual([
      "brand-1",
      "brand-2",
      "brand-3",
      "brand-4",
      "brand-duplicate-type-1",
      "brand-duplicate-type-2"
    ]);
  });

  it("keeps the commercial selection empty when an ingredient has multiple names", () => {
    expect(
      buildIngredientSelectionPatch("ia-1", ingredients, brands, productTypes)
    ).toEqual({
      tipoProductoId: "",
      ingredienteActivoId: "ia-1",
      ingredienteActivoNombre: "Abamectina",
      marcaProductoNombre: "",
      concentracionProducto: "",
      unidadMedidaProducto: ""
    });
  });

  it("auto-selects the only commercial name related to an ingredient", () => {
    expect(
      buildIngredientSelectionPatch("ia-2", ingredients, brands, productTypes)
    ).toEqual({
      tipoProductoId: "type-1",
      ingredienteActivoId: "ia-2",
      ingredienteActivoNombre: "Azufre",
      marcaProductoNombre: "Azufre 80",
      concentracionProducto: "80",
      unidadMedidaProducto: "%"
    });
  });

  it("selects the type, ingredient, commercial name, concentration and unit from a brand", () => {
    expect(buildCommercialSelectionPatch(brands[2]!, ingredients, productTypes)).toEqual({
      tipoProductoId: "type-1",
      ingredienteActivoId: "ia-2",
      ingredienteActivoNombre: "Azufre",
      marcaProductoNombre: "Azufre 80",
      concentracionProducto: "80",
      unidadMedidaProducto: "%"
    });
    expect(
      buildCommercialSelectionPatch(
        brands.find((item) => item.id === "brand-with-missing-ingredient")!,
        ingredients,
        productTypes
      )
    ).toBeNull();
    expect(
      buildCommercialSelectionPatch(
        brands.find((item) => item.id === "brand-without-type")!,
        ingredients,
        productTypes
      )
    ).toBeNull();
  });

  it("resolves repeated commercial names through the exact selected catalog row", () => {
    expect(
      buildCommercialSelectionPatch(
        brands.find((item) => item.id === "brand-duplicate-type-2")!,
        ingredients,
        productTypes
      )
    ).toMatchObject({
      tipoProductoId: "type-2",
      ingredienteActivoId: "ia-3",
      marcaProductoNombre: "Producto Dual"
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

  it("rehydrates concentration and unit after a catalog refresh", () => {
    expect(
      resolveCommercialSelectionPatch(
        "type-2",
        " cobre solo ",
        ingredients,
        brands,
        productTypes
      )
    ).toEqual({
      tipoProductoId: "type-2",
      ingredienteActivoId: "ia-3",
      ingredienteActivoNombre: "Cobre",
      marcaProductoNombre: "Cobre Solo",
      concentracionProducto: "50",
      unidadMedidaProducto: "g/Kg"
    });
    expect(
      resolveCommercialSelectionPatch(
        "type-1",
        "Producto ausente",
        ingredients,
        brands,
        productTypes
      )
    ).toBeNull();
  });
});
