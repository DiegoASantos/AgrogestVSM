import { riegosRepository } from "../repositories/riegos.repository";
import type { FuenteAgua, TipoSuelo, HumedadSuelo } from "../types";

export type SaveRiegoInput = {
  tipoRiegoId: string;
  fuenteAgua: FuenteAgua;
  tipoSuelo: TipoSuelo;
  humedadSuelo: HumedadSuelo;
  estresHidrico: boolean;
};

export const riegosService = {
  getTiposRiego() {
    return Promise.resolve(riegosRepository.getTiposRiego());
  },

  getByVisitaId(visitaId: string) {
    return Promise.resolve(riegosRepository.getByVisitaLocalId(visitaId));
  },

  saveSelection(visitaId: string, input: SaveRiegoInput) {
    const existing = riegosRepository.getByVisitaLocalId(visitaId);

    if (existing) {
      return Promise.resolve(
        riegosRepository.update(existing.id, {
          tipoRiegoId: input.tipoRiegoId,
          fuenteAgua: input.fuenteAgua,
          tipoSuelo: input.tipoSuelo,
          humedadSuelo: input.humedadSuelo,
          estresHidrico: input.estresHidrico
        })
      );
    }

    return Promise.resolve(
      riegosRepository.insert(
        {
          tipoRiegoId: input.tipoRiegoId,
          fuenteAgua: input.fuenteAgua,
          tipoSuelo: input.tipoSuelo,
          humedadSuelo: input.humedadSuelo,
          estresHidrico: input.estresHidrico
        },
        visitaId
      )
    );
  }
};
