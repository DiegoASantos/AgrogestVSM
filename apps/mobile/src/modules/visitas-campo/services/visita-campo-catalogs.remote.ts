import { ApiError, apiRequest } from "../../../shared/services";
import type {
  CampaniaCatalogItem,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  VariedadCatalogItem
} from "../types";

export const visitaCampoCatalogsRemote = {
  getCultivos() {
    return apiRequest<CultivoCatalogItem[]>("/cultivos");
  },

  getVariedadesByCultivo(cultivoId: string) {
    return apiRequest<VariedadCatalogItem[]>(`/cultivos/${cultivoId}/variedades`);
  },

  getCampaniasByCultivo(cultivoId: string) {
    return apiRequest<CampaniaCatalogItem[]>(
      `/campanias?cultivo_id=${cultivoId}&activa=true`
    );
  },

  async getEtapasFenologicasByCultivo(cultivoId: string) {
    try {
      return await apiRequest<EtapaFenologicaCatalogItem[]>(
        `/etapas-fenologicas?cultivo_id=${cultivoId}`
      );
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        throw new ApiError(
          "El catalogo de etapas fenologicas aun no esta disponible en el backend.",
          error.statusCode,
          error.details
        );
      }

      throw error;
    }
  }
};
