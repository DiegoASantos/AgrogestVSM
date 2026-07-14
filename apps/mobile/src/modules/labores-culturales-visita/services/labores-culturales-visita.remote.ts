import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import type { LaborCulturalCatalogItem, VisitaLaborCultural } from "../types";

type CreateLaborCulturalInput = {
  laborCulturalId: number;
};

export const laboresCulturalesVisitaRemote = {
  getLaboresCulturales() {
    return apiRequest<LaborCulturalCatalogItem[]>("/labores-culturales");
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaLaborCultural[]>(
      `/visitas-campo/${visitaId}/labores-culturales`
    );
  },

  create(
    visitaId: string,
    input: CreateLaborCulturalInput,
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaLaborCultural>(
      `/visitas-campo/${visitaId}/labores-culturales`,
      {
        method: "POST",
        body: input,
        ...context
      }
    );
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<VisitaLaborCultural>(`/labores-culturales-visita/${id}`, {
      method: "DELETE",
      ...context
    });
  }
};
