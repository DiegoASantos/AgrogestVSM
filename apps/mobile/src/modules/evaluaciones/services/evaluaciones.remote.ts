import { apiRequest } from "../../../shared/services";
import type { VisitaEvaluacion } from "../types";

type CreateEvaluacionInput = {
  order: number;
  percentage?: number;
  description: string;
};

type UpdateEvaluacionInput = {
  order?: number;
  percentage?: number | null;
  description?: string;
};

export const evaluacionesRemote = {
  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaEvaluacion[]>(`/visitas-campo/${visitaId}/evaluaciones`);
  },

  create(visitaId: string, input: CreateEvaluacionInput) {
    return apiRequest<VisitaEvaluacion>(`/visitas-campo/${visitaId}/evaluaciones`, {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: UpdateEvaluacionInput) {
    return apiRequest<VisitaEvaluacion>(`/evaluaciones/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  remove(id: string) {
    return apiRequest<VisitaEvaluacion>(`/evaluaciones/${id}`, {
      method: "DELETE"
    });
  }
};
