import { apiRequestAllPages } from "../../../shared/services";
import type { NutrientCatalogItem } from "../types";

export const nutricionRemote = {
  async getNutrients() {
    const nutrients = await apiRequestAllPages<NutrientCatalogItem>("/nutrientes");

    return nutrients
      .filter((nutrient) => nutrient.isActive)
      .map((nutrient) => ({
        ...nutrient,
        details: nutrient.details.filter((detail) => detail.isActive)
      }));
  },

  async getNutrientsByCrop(cropId: string) {
    const nutrients = await this.getNutrients();

    return nutrients
      .filter((nutrient) => nutrient.cultivoId === cropId);
  }
};
