import type { IngredienteActivoCatalogItem } from "../../types";

export type TipoProductoNuevo = "ingrediente" | "fertilizante" | "marca";

export type NuevoProductoFormValues = {
  tipo: TipoProductoNuevo;
  nombre: string;
  tipoFertilizante: string;
  tipoProductoId: string;
  ingredienteActivoId: string;
  concentracion: string;
  unidadMedida: string;
};

export function findSelectedIngredient(
  ingredienteActivoId: string,
  ingredientesActivos: IngredienteActivoCatalogItem[]
) {
  return ingredientesActivos.find((item) => item.id === ingredienteActivoId) ?? null;
}

export function validateNuevoProducto(
  values: NuevoProductoFormValues,
  ingredientesActivos: IngredienteActivoCatalogItem[]
): string | null {
  if (!values.nombre.trim()) {
    return "El nombre es obligatorio.";
  }
  if (values.tipo === "fertilizante" && !values.tipoFertilizante) {
    return "El tipo de fertilizante es obligatorio.";
  }
  if (values.tipo === "marca" && !values.tipoProductoId) {
    return "El tipo de producto es obligatorio.";
  }
  if (
    values.tipo === "marca" &&
    !findSelectedIngredient(values.ingredienteActivoId, ingredientesActivos)
  ) {
    return "El ingrediente activo es obligatorio.";
  }
  if (
    (values.tipo === "fertilizante" || values.tipo === "marca") &&
    !values.concentracion.trim()
  ) {
    return "La concentracion es obligatoria.";
  }
  if (
    (values.tipo === "fertilizante" || values.tipo === "marca") &&
    !values.unidadMedida.trim()
  ) {
    return "La unidad de medida es obligatoria.";
  }
  return null;
}
