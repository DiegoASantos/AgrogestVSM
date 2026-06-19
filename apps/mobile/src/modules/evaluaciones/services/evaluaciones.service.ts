import { evaluacionesRepository } from "../repositories/evaluaciones.repository";
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

export const evaluacionesService = {
  async getByVisitaId(visitaId: string) {
    return evaluacionesRepository.getByVisitaLocalId(visitaId);
  },

  async create(visitaId: string, input: CreateEvaluacionInput) {
    return evaluacionesRepository.insert(input, visitaId);
  },

  async update(id: string, input: UpdateEvaluacionInput) {
    return evaluacionesRepository.update(id, input);
  },

  async remove(id: string) {
    evaluacionesRepository.deleteById(id);
  }
};
