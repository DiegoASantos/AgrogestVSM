import { observacionesSanitariasRepository } from "../repositories/observaciones-sanitarias.repository";

type CreateObservacionSanitariaInput = {
  pestDiseaseId: string;
  incidenceLevelId?: string | null;
  observation?: string;
};

type UpdateObservacionSanitariaInput = {
  pestDiseaseId?: string;
  incidenceLevelId?: string | null;
  observation?: string | null;
};

export const observacionesSanitariasService = {
  getPestDiseases() {
    return Promise.resolve(observacionesSanitariasRepository.getPestDiseases());
  },

  getIncidenceLevels() {
    return Promise.resolve(observacionesSanitariasRepository.getIncidenceLevels());
  },

  getByVisitaId(visitaId: string) {
    return Promise.resolve(
      observacionesSanitariasRepository.getByVisitaLocalId(visitaId)
    );
  },

  create(visitaId: string, input: CreateObservacionSanitariaInput) {
    return Promise.resolve(
      observacionesSanitariasRepository.insert(input, visitaId)
    );
  },

  update(id: string, input: UpdateObservacionSanitariaInput) {
    return Promise.resolve(observacionesSanitariasRepository.update(id, input));
  },

  remove(id: string) {
    observacionesSanitariasRepository.deleteById(id);
    return Promise.resolve();
  }
};
