import { recomendacionesRepository } from "../repositories/recomendaciones.repository";

type CreateRecomendacionInput = {
  recommendationTypeId: string;
  applies: boolean;
  detail?: string;
};

type UpdateRecomendacionInput = {
  recommendationTypeId?: string;
  applies?: boolean;
  detail?: string | null;
};

export const recomendacionesService = {
  getRecommendationTypes() {
    return Promise.resolve(recomendacionesRepository.getRecommendationTypes());
  },

  getByVisitaId(visitaId: string) {
    return Promise.resolve(recomendacionesRepository.getByVisitaLocalId(visitaId));
  },

  create(visitaId: string, input: CreateRecomendacionInput) {
    return Promise.resolve(recomendacionesRepository.insert(input, visitaId));
  },

  update(id: string, input: UpdateRecomendacionInput) {
    return Promise.resolve(recomendacionesRepository.update(id, input));
  },

  remove(id: string) {
    recomendacionesRepository.deleteById(id);
    return Promise.resolve();
  }
};
