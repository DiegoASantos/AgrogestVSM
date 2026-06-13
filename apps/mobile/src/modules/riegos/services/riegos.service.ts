import { riegosRepository } from "../repositories/riegos.repository";

export const riegosService = {
  getTiposRiego() {
    return Promise.resolve(riegosRepository.getTiposRiego());
  },

  getByVisitaId(visitaId: string) {
    return Promise.resolve(riegosRepository.getByVisitaLocalId(visitaId));
  },

  saveSelection(visitaId: string, tipoRiegoId: string) {
    const existing = riegosRepository.getByVisitaLocalId(visitaId);

    if (existing) {
      if (existing.tipoRiegoId === tipoRiegoId) {
        return Promise.resolve(existing);
      }

      return Promise.resolve(
        riegosRepository.update(existing.id, {
          tipoRiegoId
        })
      );
    }

    return Promise.resolve(
      riegosRepository.insert(
        {
          tipoRiegoId
        },
        visitaId
      )
    );
  }
};
