import { apiRequest } from "../../../shared/services";
import type {
  RecommendationTypeCatalogItem,
  VisitaRecomendacion
} from "../types";

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

export const recomendacionesRemote = {
  getRecommendationTypes() {
    return apiRequest<RecommendationTypeCatalogItem[]>("/tipos-recomendacion");
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaRecomendacion[]>(
      `/visitas-campo/${visitaId}/recomendaciones`
    );
  },

  create(visitaId: string, input: CreateRecomendacionInput) {
    return apiRequest<VisitaRecomendacion>(`/visitas-campo/${visitaId}/recomendaciones`, {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: UpdateRecomendacionInput) {
    return apiRequest<VisitaRecomendacion>(`/recomendaciones-visita/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  remove(id: string) {
    return apiRequest<VisitaRecomendacion>(`/recomendaciones-visita/${id}`, {
      method: "DELETE"
    });
  }
};
