import { nutricionRepository } from "../repositories";

export const nutricionService = {
  getNutrientsByCrop(cropId: string) {
    return nutricionRepository.getNutrientsByCrop(cropId);
  }
};
