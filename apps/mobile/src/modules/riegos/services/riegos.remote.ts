import { apiRequest } from "../../../shared/services";
import type { TipoRiegoCatalogItem, VisitaRiego } from "../types";

type CreateRiegoInput = {
  tipoRiegoId: number;
};

type UpdateRiegoInput = {
  tipoRiegoId?: number;
};

export const riegosRemote = {
  getTiposRiego() {
    return apiRequest<TipoRiegoCatalogItem[]>("/tipos-riego");
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaRiego | null>(`/visitas-campo/${visitaId}/riego`);
  },

  create(visitaId: string, input: CreateRiegoInput) {
    return apiRequest<VisitaRiego>(`/visitas-campo/${visitaId}/riego`, {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: UpdateRiegoInput) {
    return apiRequest<VisitaRiego>(`/riegos-visita/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  remove(id: string) {
    return apiRequest<VisitaRiego>(`/riegos-visita/${id}`, {
      method: "DELETE"
    });
  }
};
