import { apiRequest } from "../../../shared/services";
import type { NutrientCatalogItem } from "../types";

export const nutricionRemote = {
  async getNutrientsByCrop(cropId: string) {
    const nutrients = await fetchAllPaginated<NutrientCatalogItem>("/nutrientes");

    return nutrients
      .filter(
        (nutrient) => nutrient.isActive && nutrient.cultivoId === cropId
      )
      .map((nutrient) => ({
        ...nutrient,
        details: nutrient.details.filter((detail) => detail.isActive)
      }));
  }
};

async function fetchAllPaginated<T>(path: string): Promise<T[]> {
  const collected: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  const pageSize = 200;

  for (let page = 1; page <= 25; page += 1) {
    const items = await apiRequest<T[]>(
      `${path}${separator}page=${page}&limit=${pageSize}`
    );

    collected.push(...items);

    if (items.length < pageSize) {
      break;
    }
  }

  return collected;
}
