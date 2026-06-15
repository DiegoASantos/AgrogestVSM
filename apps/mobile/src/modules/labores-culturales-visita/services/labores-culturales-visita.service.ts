import { laboresCulturalesVisitaRepository } from "../repositories/labores-culturales-visita.repository";

export const laboresCulturalesVisitaService = {
  getLaboresCulturales() {
    return Promise.resolve(laboresCulturalesVisitaRepository.getLaboresCulturales());
  },

  getByVisitaId(visitaId: string) {
    return Promise.resolve(
      laboresCulturalesVisitaRepository.getByVisitaLocalId(visitaId)
    );
  },

  saveSelections(visitaId: string, selectedLaborIds: string[]) {
    const selectedSet = new Set(selectedLaborIds);
    const currentLabores = laboresCulturalesVisitaRepository.getByVisitaLocalId(visitaId);

    for (const currentLabor of currentLabores) {
      if (!selectedSet.has(currentLabor.laborCulturalId)) {
        laboresCulturalesVisitaRepository.deleteById(currentLabor.id);
      }
    }

    for (const laborId of selectedLaborIds) {
      const existing = currentLabores.find(
        (currentLabor) => currentLabor.laborCulturalId === laborId
      );

      if (!existing) {
        laboresCulturalesVisitaRepository.insert(
          {
            laborCulturalId: laborId
          },
          visitaId
        );
      }
    }

    return Promise.resolve(
      laboresCulturalesVisitaRepository.getByVisitaLocalId(visitaId)
    );
  }
};
