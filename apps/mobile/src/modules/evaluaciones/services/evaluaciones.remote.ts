import { apiRequest } from "../../../shared/services";
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
