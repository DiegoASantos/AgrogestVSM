import { describe, expect, it } from "vitest";

import type { IngredienteActivoCatalogItem } from "../../types";
import {
  findSelectedIngredient,
  validateNuevoProducto,
  type NuevoProductoFormValues
} from "./nuevo-producto-form";

const ingredientes: IngredienteActivoCatalogItem[] = [
  {
    id: "ingrediente-local-1",
    publicId: "ingrediente-publico-1",
    name: "Nitrato de potasio",
    description: null
  }
];

const marcaValida: NuevoProductoFormValues = {
  tipo: "marca",
  nombre: "Marca Potasio",
  tipoFertilizante: "solido",
  tipoProductoId: "1",
  ingredienteActivoId: "ingrediente-local-1",
  concentracion: "46",
  unidadMedida: "%"
};

describe("nuevo producto form", () => {
  it("requires a valid active ingredient when creating a brand", () => {
    expect(
      validateNuevoProducto({ ...marcaValida, ingredienteActivoId: "" }, ingredientes)
    ).toBe("El ingrediente activo es obligatorio.");
    expect(
      validateNuevoProducto(
        { ...marcaValida, ingredienteActivoId: "ingrediente-inexistente" },
        ingredientes
      )
    ).toBe("El ingrediente activo es obligatorio.");
  });

  it("accepts and resolves an ingredient from the complete local catalog", () => {
    expect(validateNuevoProducto(marcaValida, ingredientes)).toBeNull();
    expect(
      findSelectedIngredient(marcaValida.ingredienteActivoId, ingredientes)
    ).toMatchObject({
      id: "ingrediente-local-1",
      name: "Nitrato de potasio"
    });
  });
});
