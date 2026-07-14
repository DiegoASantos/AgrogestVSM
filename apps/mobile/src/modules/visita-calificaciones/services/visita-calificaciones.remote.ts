import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import type {
  RecetaAnterior,
  UpsertCalificacionInput,
  VisitaCalificacion
} from "../types";

export const visitaCalificacionesRemote = {
  upsert(
    visitaId: string,
    input: UpsertCalificacionInput,
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaCalificacion>(
      `/visitas-campo/${visitaId}/calificaciones`,
      {
        method: "POST",
        body: input,
        ...context
      }
    );
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaCalificacion[]>(
      `/visitas-campo/${visitaId}/calificaciones`
    );
  },

  getRecetaAnterior(parcelaId: string, excluirVisitaId?: string | null) {
    const suffix = excluirVisitaId ? `?excluirVisitaId=${excluirVisitaId}` : "";

    return apiRequest<RecetaAnterior>(
      `/parcelas/${parcelaId}/visita-anterior-receta${suffix}`
    );
  }
};
