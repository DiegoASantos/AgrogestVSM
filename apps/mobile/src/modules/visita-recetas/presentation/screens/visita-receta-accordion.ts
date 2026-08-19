import {
  getDosisUnit,
  parsePositiveDecimal,
  type AppFertilizacion,
  type AppFitosanidad,
  type AppMezcla
} from "./visita-receta-multiple-products";

export type RecipeCardKey =
  | `fitosanidad:${string}`
  | `mezcla:${string}`
  | `fertilizacion:${string}`;

export type RecipeAccordionCardState = {
  key: RecipeCardKey;
  isComplete: boolean;
};

export type RecipeFertilizacionGroup = {
  key: string;
  productos: AppFertilizacion[];
};

export function getFitosanidadCardKey(localId: string): RecipeCardKey {
  return `fitosanidad:${localId}`;
}

export function getMezclaCardKey(localId: string): RecipeCardKey {
  return `mezcla:${localId}`;
}

export function getFertilizacionCardKey(groupKey: string): RecipeCardKey {
  return `fertilizacion:${groupKey}`;
}

export function groupRecipeFertilizaciones(
  fertilizaciones: AppFertilizacion[]
): RecipeFertilizacionGroup[] {
  const groups = new Map<string, AppFertilizacion[]>();

  for (const item of fertilizaciones) {
    const key = item.nutrienteId
      ? `${item.enfoque ?? "reactivo"}:${item.nutrienteId}`
      : `legacy:${item.localId}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].map(([key, productos]) => ({ key, productos }));
}

export function buildRecipeAccordionCards(
  fitosanidadApps: AppFitosanidad[],
  mezclas: AppMezcla[],
  fertilizaciones: AppFertilizacion[]
): RecipeAccordionCardState[] {
  return [
    ...fitosanidadApps.map((application) => ({
      key: getFitosanidadCardKey(application.localId),
      isComplete: isFitosanidadCardComplete(application)
    })),
    ...mezclas.map((mezcla) => ({
      key: getMezclaCardKey(mezcla.localId),
      isComplete: isMezclaCardComplete(mezcla, fitosanidadApps)
    })),
    ...groupRecipeFertilizaciones(fertilizaciones).map((group) => ({
      key: getFertilizacionCardKey(group.key),
      isComplete: isFertilizacionGroupComplete(group.productos)
    }))
  ];
}

export function findFirstIncompleteRecipeCard(
  cards: RecipeAccordionCardState[]
): RecipeCardKey | null {
  return cards.find((card) => !card.isComplete)?.key ?? null;
}

export function toggleActiveRecipeCard(
  activeKey: RecipeCardKey | null,
  requestedKey: RecipeCardKey
): RecipeCardKey | null {
  return activeKey === requestedKey ? null : requestedKey;
}

export function resolveRecipeCardAfterRemoval(
  activeKey: RecipeCardKey | null,
  cards: RecipeAccordionCardState[]
): RecipeCardKey | null {
  if (activeKey && cards.some((card) => card.key === activeKey)) {
    return activeKey;
  }

  return findFirstIncompleteRecipeCard(cards);
}

export function isFitosanidadCardComplete(application: AppFitosanidad) {
  return Boolean(
    application.tipoControlId &&
    application.ingredientes.length > 0 &&
    application.ingredientes.every(
      (ingredient) =>
        ingredient.mezclaNumero > 0 &&
        ingredient.tipoProductoId &&
        ingredient.modoAccionId &&
        ingredient.ingredienteActivoNombre.trim() &&
        ingredient.marcaProductoNombre.trim() &&
        parsePositiveDecimal(ingredient.dosisProducto) &&
        getDosisUnit(ingredient.unidadDosis)
    )
  );
}

export function isMezclaCardComplete(
  mezcla: AppMezcla,
  fitosanidadApps: AppFitosanidad[]
) {
  const hasAssignedProduct = fitosanidadApps.some((application) =>
    application.ingredientes.some(
      (ingredient) => ingredient.mezclaNumero === mezcla.numero
    )
  );

  return Boolean(hasAssignedProduct && parsePositiveDecimal(mezcla.volumenAplicacion));
}

export function isFertilizacionGroupComplete(productos: AppFertilizacion[]) {
  return (
    productos.length > 0 &&
    productos.every((producto) => {
      const hasApplicationQuantity =
        producto.viaAplicacion === "edafica"
          ? parsePositiveDecimal(producto.cantidadTotalPlantas)
          : parsePositiveDecimal(producto.volumenAplicacion);

      return Boolean(
        producto.fertilizanteNombre.trim() &&
        parsePositiveDecimal(producto.dosis) &&
        getDosisUnit(producto.unidadDosis) &&
        hasApplicationQuantity
      );
    })
  );
}
