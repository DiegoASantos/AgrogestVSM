import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import type { TipoRiegoCatalogItem, VisitaRiego } from "../types";

type CreateRiegoInput = {
  tipoRiegoId: number;
  fuenteAgua?: string | null;
  tipoSuelo?: string | null;
  humedadSuelo?: string | null;
  estresHidrico?: boolean | null;
};

type UpdateRiegoInput = {
  tipoRiegoId?: number;
  fuenteAgua?: string | null;
  tipoSuelo?: string | null;
  humedadSuelo?: string | null;
  estresHidrico?: boolean | null;
};

export const riegosRemote = {
  getTiposRiego() {
    return apiRequest<TipoRiegoCatalogItem[]>("/tipos-riego");
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaRiego | null>(`/visitas-campo/${visitaId}/riego`);
  },

  create(visitaId: string, input: CreateRiegoInput, context: ApiRequestContext = {}) {
    return apiRequest<VisitaRiego>(`/visitas-campo/${visitaId}/riego`, {
      method: "POST",
      body: input,
      ...context
    });
  },

  update(id: string, input: UpdateRiegoInput, context: ApiRequestContext = {}) {
    return apiRequest<VisitaRiego>(`/riegos-visita/${id}`, {
      method: "PATCH",
      body: input,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<VisitaRiego>(`/riegos-visita/${id}`, {
      method: "DELETE",
      ...context
    });
  }
};
