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
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[]
) {
  if (!tipoProductoId) {
    return [];
  }

  const validIngredientIds = new Set(
    ingredientesActivos.map((ingrediente) => ingrediente.id)
  );

  return marcasProducto.filter(
    (marca) =>
      marca.tipoProductoId === tipoProductoId &&
      Boolean(
        marca.ingredienteActivoId && validIngredientIds.has(marca.ingredienteActivoId)
      ) &&
      (!ingredienteActivoId || marca.ingredienteActivoId === ingredienteActivoId)
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
    ingredientesActivos,
    marcasProducto
  );

  if (commercialOptions.length !== 1 || !commercialOptions[0]) {
    return patch;
  }

  const commercialPatch = buildCommercialSelectionPatch(
    commercialOptions[0],
    ingredientesActivos
  );

  return commercialPatch ? { ...patch, ...commercialPatch } : patch;
}

export function buildCommercialSelectionPatch(
  option: MarcaProductoCatalogItem,
  ingredientesActivos: IngredienteActivoCatalogItem[]
): Pick<
  RecipeSelectionPatch,
  | "ingredienteActivoId"
  | "ingredienteActivoNombre"
  | "marcaProductoNombre"
  | "concentracionProducto"
  | "unidadMedidaProducto"
> | null {
  const selectedIngredient = ingredientesActivos.find(
    (ingrediente) => ingrediente.id === option.ingredienteActivoId
  );

  if (!selectedIngredient) {
    return null;
  }

  return {
    ingredienteActivoId: selectedIngredient.id,
    ingredienteActivoNombre: selectedIngredient.name,
    marcaProductoNombre: option.name,
    concentracionProducto:
      option.concentracionTexto ?? option.concentracion?.toString() ?? "",
    unidadMedidaProducto: option.unidadMedida ?? ""
  };
}

export function resolveCommercialSelectionPatch(
  tipoProductoId: string,
  marcaProductoNombre: string,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[]
) {
  const normalizedName = marcaProductoNombre.trim().toLowerCase();
  if (!normalizedName) return null;

  const selected = getCommercialOptions(
    tipoProductoId,
    "",
    ingredientesActivos,
    marcasProducto
  ).find((option) => option.name.trim().toLowerCase() === normalizedName);

  return selected ? buildCommercialSelectionPatch(selected, ingredientesActivos) : null;
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
