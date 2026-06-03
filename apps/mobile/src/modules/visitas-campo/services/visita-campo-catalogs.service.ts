import { visitasCampoRepository } from "../repositories/visitas-campo.repository";

export const visitaCampoCatalogsService = {
  getCultivos() {
    return Promise.resolve(visitasCampoRepository.getCultivos());
  },

  getVariedadesByCultivo(cultivoId: string) {
    return Promise.resolve(visitasCampoRepository.getVariedadesByCultivo(cultivoId));
  },

  getCampaniasByCultivo(cultivoId: string) {
    return Promise.resolve(visitasCampoRepository.getCampaniasByCultivo(cultivoId));
  },

  getEtapasFenologicasByCultivo(cultivoId: string) {
    return Promise.resolve(
      visitasCampoRepository.getEtapasFenologicasByCultivo(cultivoId)
    );
  },

  getSubEtapasByEtapaFenologica(etapaFenologicaId: string) {
    return Promise.resolve(
      visitasCampoRepository.getSubEtapasByEtapaFenologica(etapaFenologicaId)
    );
  }
};
