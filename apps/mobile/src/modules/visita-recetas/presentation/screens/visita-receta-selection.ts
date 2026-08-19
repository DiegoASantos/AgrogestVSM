import type {
  IngredienteActivoCatalogItem,
  MarcaProductoCatalogItem,
  TipoProductoFitosanitarioCatalogItem
} from "../../types";

export type RecipeSelectionPatch = {
  tipoProductoId: string;
  ingredienteActivoId: string;
  ingredienteActivoNombre: string;
  marcaProductoNombre: string;
  concentracionProducto: string;
  unidadMedidaProducto: string;
};

export function getIngredientOptions(
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[],
  tiposProducto: TipoProductoFitosanitarioCatalogItem[]
) {
  const validProductTypeIds = new Set(tiposProducto.map((item) => item.id));
  const availableIds = new Set(
    marcasProducto
      .filter((marca) =>
        Boolean(marca.tipoProductoId && validProductTypeIds.has(marca.tipoProductoId))
      )
      .map((marca) => marca.ingredienteActivoId)
      .filter((id): id is string => Boolean(id))
  );

  return ingredientesActivos.filter((ingrediente) => availableIds.has(ingrediente.id));
}

export function getCommercialOptions(
  ingredienteActivoId: string,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[],
  tiposProducto: TipoProductoFitosanitarioCatalogItem[]
) {
  const validProductTypeIds = new Set(tiposProducto.map((item) => item.id));
  const validIngredientIds = new Set(
    ingredientesActivos.map((ingrediente) => ingrediente.id)
  );

  return marcasProducto.filter(
    (marca) =>
      Boolean(marca.tipoProductoId && validProductTypeIds.has(marca.tipoProductoId)) &&
      Boolean(
        marca.ingredienteActivoId && validIngredientIds.has(marca.ingredienteActivoId)
      ) &&
      (!ingredienteActivoId || marca.ingredienteActivoId === ingredienteActivoId)
  );
}

export function buildIngredientSelectionPatch(
  ingredienteActivoId: string,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  marcasProducto: MarcaProductoCatalogItem[],
  tiposProducto: TipoProductoFitosanitarioCatalogItem[]
): RecipeSelectionPatch {
  const selectedIngredient = ingredientesActivos.find(
    (ingrediente) => ingrediente.id === ingredienteActivoId
  );
  const patch: RecipeSelectionPatch = {
    tipoProductoId: "",
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
    selectedIngredient.id,
    ingredientesActivos,
    marcasProducto,
    tiposProducto
  );

  if (commercialOptions.length !== 1 || !commercialOptions[0]) {
    return patch;
  }

  const commercialPatch = buildCommercialSelectionPatch(
    commercialOptions[0],
    ingredientesActivos,
    tiposProducto
  );

  return commercialPatch ? { ...patch, ...commercialPatch } : patch;
}

export function buildCommercialSelectionPatch(
  option: MarcaProductoCatalogItem,
  ingredientesActivos: IngredienteActivoCatalogItem[],
  tiposProducto: TipoProductoFitosanitarioCatalogItem[]
): Pick<
  RecipeSelectionPatch,
  | "tipoProductoId"
  | "ingredienteActivoId"
  | "ingredienteActivoNombre"
  | "marcaProductoNombre"
  | "concentracionProducto"
  | "unidadMedidaProducto"
> | null {
  const selectedIngredient = ingredientesActivos.find(
    (ingrediente) => ingrediente.id === option.ingredienteActivoId
  );

  if (
    !selectedIngredient ||
    !option.tipoProductoId ||
    !tiposProducto.some((item) => item.id === option.tipoProductoId)
  ) {
    return null;
  }

  return {
    tipoProductoId: option.tipoProductoId,
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
  marcasProducto: MarcaProductoCatalogItem[],
  tiposProducto: TipoProductoFitosanitarioCatalogItem[]
) {
  const normalizedName = marcaProductoNombre.trim().toLowerCase();
  if (!normalizedName) return null;

  const selected = getCommercialOptions(
    "",
    ingredientesActivos,
    marcasProducto,
    tiposProducto
  ).find(
    (option) =>
      option.tipoProductoId === tipoProductoId &&
      option.name.trim().toLowerCase() === normalizedName
  );

  return selected
    ? buildCommercialSelectionPatch(selected, ingredientesActivos, tiposProducto)
    : null;
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
