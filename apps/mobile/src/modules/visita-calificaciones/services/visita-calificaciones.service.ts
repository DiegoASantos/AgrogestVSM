import { visitasCampoRepository } from "../../visitas-campo/repositories/visitas-campo.repository";
import { visitaCalificacionesRepository } from "../repositories/visita-calificaciones.repository";
import type {
  CalificacionModulo,
  RecetaAnterior,
  UpsertCalificacionInput
} from "../types";
import { visitaCalificacionesRemote } from "./visita-calificaciones.remote";

export const visitaCalificacionesService = {
  getByVisitaId(visitaLocalId: string) {
    return visitaCalificacionesRepository.getByVisitaLocalId(visitaLocalId);
  },

  getByModulo(visitaLocalId: string, modulo: CalificacionModulo) {
    return visitaCalificacionesRepository.getByVisitaAndModulo(
      visitaLocalId,
      modulo
    );
  },

  upsert(visitaLocalId: string, input: UpsertCalificacionInput) {
    return visitaCalificacionesRepository.upsert(visitaLocalId, input);
  },

  autoScoreIfEmpty(
    visitaLocalId: string,
    modulo: CalificacionModulo,
    hasRegisteredData: boolean,
    observacion: string
  ) {
    const existing = this.getByModulo(visitaLocalId, modulo);

    if (hasRegisteredData || existing) {
      return existing;
    }

    return this.upsert(visitaLocalId, {
      modulo,
      puntaje: 3,
      observacion
    });
  },

  async fetchRecetaAnteriorForVisit(visitaLocalId: string): Promise<RecetaAnterior> {
    const visita = visitasCampoRepository.getById(visitaLocalId);

    if (!visita) {
      return { existe: false };
    }

    if (!visita.serverId) {
      return { existe: false };
    }

    const receta = await visitaCalificacionesRemote.getRecetaAnterior(
      visita.parcelaId,
      visita.serverId
    );

    return receta;
  }
};
