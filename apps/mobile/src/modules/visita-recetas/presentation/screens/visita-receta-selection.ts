import type { IngredienteActivoCatalogItem, MarcaProductoCatalogItem } from "../../types";

export type RecipeSelectionPatch = {
  tipoProductoId?: string;
  ingredienteActivoId: string;
  ingredienteActivoNombre: string;
  marcaProductoNombre: string;
  concentracionProducto: string;
  unidadMedidaProducto: string;
};

export function getIngredientOptions(
  tipoProductoId: string,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[]
) {
  if (!tipoProductoId) {
    return [];
  }

  const availableIds = new Set(
    marcasProducto
      .filter((marca) => marca.tipoProductoId === tipoProductoId)
      .map((marca) => marca.ingredienteActivoId)
      .filter((id): id is string => Boolean(id))
  );

  return ingredientesActivos.filter((ingrediente) => availableIds.has(ingrediente.id));
}

export function getCommercialOptions(
  tipoProductoId: string,
  ingredienteActivoId: string,
  marcasProducto: MarcaProductoCatalogItem[]
) {
  if (!tipoProductoId || !ingredienteActivoId) {
    return [];
  }

  return marcasProducto.filter(
    (marca) =>
      marca.tipoProductoId === tipoProductoId &&
      marca.ingredienteActivoId === ingredienteActivoId
  );
}

export function buildTypeSelectionPatch(
  tipoProductoId: string,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[]
): RecipeSelectionPatch {
  const patch: RecipeSelectionPatch = {
    tipoProductoId,
    ingredienteActivoId: "",
    ingredienteActivoNombre: "",
    marcaProductoNombre: "",
    concentracionProducto: "",
    unidadMedidaProducto: ""
  };
  const ingredientOptions = getIngredientOptions(
    tipoProductoId,
    ingredientesActivos,
    marcasProducto
  );

  if (ingredientOptions.length !== 1 || !ingredientOptions[0]) {
    return patch;
  }

  return {
    ...patch,
    ...buildIngredientSelectionPatch(
      tipoProductoId,
      ingredientOptions[0].id,
      ingredientesActivos,
      marcasProducto
    )
  };
}

export function buildIngredientSelectionPatch(
  tipoProductoId: string,
  ingredienteActivoId: string,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[]
): RecipeSelectionPatch {
  const selectedIngredient = ingredientesActivos.find(
    (ingrediente) => ingrediente.id === ingredienteActivoId
  );
  const patch: RecipeSelectionPatch = {
    ingredienteActivoId: selectedIngredient?.id ?? "",
    ingredienteActivoNombre: selectedIngredient?.name ?? "",
    marcaProductoNombre: "",
    concentracionProducto: "",
    unidadMedidaProducto: ""
  };

  if (!selectedIngredient) {
    return patch;
  }

  const commercialOptions = getCommercialOptions(
    tipoProductoId,
    selectedIngredient.id,
    marcasProducto
  );

  if (commercialOptions.length !== 1 || !commercialOptions[0]) {
    return patch;
  }

  return {
    ...patch,
    ...buildCommercialSelectionPatch(commercialOptions[0])
  };
}

export function buildCommercialSelectionPatch(
  option: MarcaProductoCatalogItem
): Pick<
  RecipeSelectionPatch,
  "marcaProductoNombre" | "concentracionProducto" | "unidadMedidaProducto"
> {
  return {
    marcaProductoNombre: option.name,
    concentracionProducto:
      option.concentracionTexto ?? option.concentracion?.toString() ?? "",
    unidadMedidaProducto: option.unidadMedida ?? ""
  };
}

export function resolveIngredientId(
  tipoProductoId: string,
  ingredienteActivoNombre: string,
  marcaProductoNombre: string,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[]
) {
  const directMatch = ingredientesActivos.find(
    (ingrediente) => ingrediente.name === ingredienteActivoNombre
  );

  if (directMatch) {
    return directMatch.id;
  }

  return (
    marcasProducto.find(
      (marca) =>
        marca.tipoProductoId === tipoProductoId &&
        marca.name === marcaProductoNombre &&
        marca.ingredienteActivoNombre === ingredienteActivoNombre
    )?.ingredienteActivoId ?? ""
  );
}
