import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import type { VisitaEvaluacion } from "../types";
import type { OrganoAfectado } from "../../observaciones-sanitarias/types";

type CreateEvaluacionInput = {
  order: number;
  incidencePercentage?: number | null;
  percentage?: number | null;
  description: string;
  organosAfectados?: OrganoAfectado[];
};

type UpdateEvaluacionInput = {
  order?: number;
  incidencePercentage?: number | null;
  percentage?: number | null;
  description?: string;
  organosAfectados?: OrganoAfectado[];
};

export const evaluacionesRemote = {
  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaEvaluacion[]>(`/visitas-campo/${visitaId}/evaluaciones`);
  },

  create(
    visitaId: string,
    input: CreateEvaluacionInput,
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaEvaluacion>(`/visitas-campo/${visitaId}/evaluaciones`, {
      method: "POST",
      body: input,
      ...context
    });
  },

  update(id: string, input: UpdateEvaluacionInput, context: ApiRequestContext = {}) {
    return apiRequest<VisitaEvaluacion>(`/evaluaciones/${id}`, {
      method: "PATCH",
      body: input,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<VisitaEvaluacion>(`/evaluaciones/${id}`, {
      method: "DELETE",
      ...context
    });
  }
};
