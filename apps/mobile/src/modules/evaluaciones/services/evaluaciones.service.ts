import { evaluacionesRepository } from "../repositories/evaluaciones.repository";

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
