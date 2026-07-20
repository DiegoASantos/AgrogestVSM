import { observacionesSanitariasRepository } from "../repositories/observaciones-sanitarias.repository";
import { visitaStepNotesRepository } from "../repositories/visita-step-notes.repository";
import type { OrganoAfectado } from "../types";

type CreateObservacionSanitariaInput = {
  pestDiseaseId: string;
  incidenceLevelId?: string | null;
  severityLevelId?: string | null;
  incidencePercentage?: number | null;
  observation?: string;
  organosAfectados: OrganoAfectado[];
};

type UpdateObservacionSanitariaInput = {
  pestDiseaseId?: string;
  incidenceLevelId?: string | null;
  severityLevelId?: string | null;
  incidencePercentage?: number | null;
  observation?: string | null;
  organosAfectados?: OrganoAfectado[];
};

export const observacionesSanitariasService = {
  getPestDiseases() {
    return Promise.resolve(observacionesSanitariasRepository.getPestDiseases());
  },

  getPestDiseasesByPhenologicalStage(phenologicalStageId: string) {
    return Promise.resolve(
      observacionesSanitariasRepository.getPestDiseasesByPhenologicalStage(
        phenologicalStageId
      )
    );
  },

  getIncidenceLevels() {
    return Promise.resolve(observacionesSanitariasRepository.getIncidenceLevels());
  },

  getByVisitaId(visitaId: string) {
    return Promise.resolve(
      observacionesSanitariasRepository.getByVisitaLocalId(visitaId)
    );
  },

  getStepNote(visitaId: string, stepNumber: number) {
    return Promise.resolve(
      visitaStepNotesRepository.getByVisitaAndStep(visitaId, stepNumber)
    );
  },

  upsertStepNote(
    visitaId: string,
    stepNumber: number,
    input: {
      observation?: string | null;
      recommendation?: string | null;
      finalizedAt?: string | null;
    }
  ) {
    return Promise.resolve(visitaStepNotesRepository.upsert(visitaId, stepNumber, input));
  },

  create(visitaId: string, input: CreateObservacionSanitariaInput) {
    return Promise.resolve(observacionesSanitariasRepository.insert(input, visitaId));
  },

  update(id: string, input: UpdateObservacionSanitariaInput) {
    return Promise.resolve(observacionesSanitariasRepository.update(id, input));
  },

  remove(id: string) {
    observacionesSanitariasRepository.deleteById(id);
    return Promise.resolve();
  }
};
