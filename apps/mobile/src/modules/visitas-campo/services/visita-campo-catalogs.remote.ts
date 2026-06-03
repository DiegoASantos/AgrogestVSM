import { ApiError, apiRequest } from "../../../shared/services";
import type {
  CampaniaCatalogItem,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  SubEtapaCatalogItem,
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
  },

  getSubEtapas() {
    return fetchAllPaginated<SubEtapaCatalogItem>("/sub-etapas?estado=true");
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
