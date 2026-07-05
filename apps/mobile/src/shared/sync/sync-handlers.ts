import { evaluacionesRepository } from "../../modules/evaluaciones/repositories/evaluaciones.repository";
import { evaluacionesRemote } from "../../modules/evaluaciones/services/evaluaciones.remote";
import type { VisitaEvaluacion } from "../../modules/evaluaciones/types";
import { laboresCulturalesVisitaRepository } from "../../modules/labores-culturales-visita/repositories/labores-culturales-visita.repository";
import { laboresCulturalesVisitaRemote } from "../../modules/labores-culturales-visita/services/labores-culturales-visita.remote";
import type { VisitaLaborCultural } from "../../modules/labores-culturales-visita/types";
import { observacionesSanitariasRepository } from "../../modules/observaciones-sanitarias/repositories/observaciones-sanitarias.repository";
import { visitaStepNotesRepository } from "../../modules/observaciones-sanitarias/repositories/visita-step-notes.repository";
import { observacionesSanitariasRemote } from "../../modules/observaciones-sanitarias/services/observaciones-sanitarias.remote";
import type {
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../modules/observaciones-sanitarias/types";
import { riegosRepository } from "../../modules/riegos/repositories/riegos.repository";
import { riegosRemote } from "../../modules/riegos/services/riegos.remote";
import type { VisitaRiego } from "../../modules/riegos/types";
import { visitasCampoRepository } from "../../modules/visitas-campo/repositories/visitas-campo.repository";
import { visitasCampoRemote } from "../../modules/visitas-campo/services/visitas-campo.remote";
import type {
  CreateVisitaCampoDraft,
  VisitaCampo
} from "../../modules/visitas-campo/types";
import { getNowIsoString } from "../database/sqlite-utils";
import { ApiError } from "../services/api/errors";
import { getApiToken } from "../services/api/auth-store";
import type { SyncOutboxItem } from "../database/sync-outbox";
import type { SyncEntityType } from "./sync-entities";
import { generatePublicId, isUuid } from "../utils/local-id";

import { visitaRecetasRepository } from "../../modules/visita-recetas/repositories/visita-recetas.repository";
import { visitaRecetasRemote } from "../../modules/visita-recetas/services/visita-recetas.remote";
import { visitaCalificacionesRepository } from "../../modules/visita-calificaciones/repositories/visita-calificaciones.repository";
import { visitaCalificacionesRemote } from "../../modules/visita-calificaciones/services";

export type SyncHandlerResult =
  | { status: "synced"; serverId: string }
  | { status: "skipped" }
  | { status: "deleted_local" };

export async function handleVisitaCampo(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    const serverId = getDeleteServerId(entry);

    if (!serverId) {
      return { status: "deleted_local" };
    }

    await visitasCampoRemote.remove(serverId);
    return { status: "synced", serverId };
  }

  const visita = visitasCampoRepository.getById(entry.entityLocalId);

  if (!visita) {
    return { status: "deleted_local" };
  }

  if (entry.operation === "create") {
    const apiToken = getApiToken();

    if (!apiToken) {
      throw new ApiError("No hay token disponible para sincronizar la visita.", 401);
    }

    const publicId = ensureVisitaPublicId(visita);
    const response = await visitasCampoRemote.create(
      {
        ...buildVisitaCampoCreateBody(visita),
        publicId
      },
      { accessToken: apiToken }
    );

    visitasCampoRepository.update(visita.id, {
      serverId: response.id,
      syncStatus: "synced",
      synchronizedAt: getNowIsoString(),
      publicId: response.publicId ?? publicId
    });

    return { status: "synced", serverId: response.id };
  }

  if (entry.operation === "update") {
    if (!visita.serverId) {
      return { status: "skipped" };
    }

    await visitasCampoRemote.update(visita.serverId, buildVisitaCampoUpdateBody(visita));

    visitasCampoRepository.update(visita.id, {
      syncStatus: "synced",
      synchronizedAt: getNowIsoString()
    });

    return { status: "synced", serverId: visita.serverId };
  }

  return { status: "skipped" };
}

export async function handleEvaluacion(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    const serverId = getDeleteServerId(entry);

    if (!serverId) {
      return { status: "deleted_local" };
    }

    await evaluacionesRemote.remove(serverId);
    return { status: "synced", serverId };
  }

  const evaluacion = evaluacionesRepository.getById(entry.entityLocalId);

  if (!evaluacion) {
    return { status: "deleted_local" };
  }

  if (entry.operation === "create") {
    const visitaPadre = visitasCampoRepository.getById(evaluacion.visitaId);

    if (!visitaPadre) {
      return { status: "deleted_local" };
    }

    if (visitaPadre.syncStatus === "error") {
      throw new Error("La visita padre no pudo sincronizarse.");
    }

    if (!visitaPadre.serverId) {
      return { status: "skipped" };
    }

    const response = await evaluacionesRemote.create(visitaPadre.serverId, {
      ...buildEvaluacionCreateBody(evaluacion)
    });

    evaluacionesRepository.update(evaluacion.id, {
      serverId: response.id,
      syncStatus: "synced"
    });

    return { status: "synced", serverId: response.id };
  }

  const visitaPadreForUpdate = visitasCampoRepository.getById(evaluacion.visitaId);

  if (visitaPadreForUpdate?.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!evaluacion.serverId) {
    return { status: "skipped" };
  }

  await evaluacionesRemote.update(evaluacion.serverId, {
    ...buildEvaluacionUpdateBody(evaluacion)
  });

  evaluacionesRepository.update(evaluacion.id, {
    syncStatus: "synced"
  });

  return { status: "synced", serverId: evaluacion.serverId };
}

export async function handleObservacion(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    const serverId = getDeleteServerId(entry);

    if (!serverId) {
      return { status: "deleted_local" };
    }

    await observacionesSanitariasRemote.remove(serverId);
    return { status: "synced", serverId };
  }

  const observacion = observacionesSanitariasRepository.getById(entry.entityLocalId);

  if (!observacion) {
    return { status: "deleted_local" };
  }

  if (entry.operation === "create") {
    const visitaPadre = visitasCampoRepository.getById(observacion.visitaId);

    if (!visitaPadre) {
      return { status: "deleted_local" };
    }

    if (visitaPadre.syncStatus === "error") {
      throw new Error("La visita padre no pudo sincronizarse.");
    }

    if (!visitaPadre.serverId) {
      return { status: "skipped" };
    }

    const response = await observacionesSanitariasRemote.create(visitaPadre.serverId, {
      ...buildObservacionCreateBody(observacion)
    });

    observacionesSanitariasRepository.update(observacion.id, {
      serverId: response.id,
      syncStatus: "synced"
    });

    return { status: "synced", serverId: response.id };
  }

  const visitaPadreForUpdate = visitasCampoRepository.getById(observacion.visitaId);

  if (visitaPadreForUpdate?.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!observacion.serverId) {
    return { status: "skipped" };
  }

  await observacionesSanitariasRemote.update(observacion.serverId, {
    ...buildObservacionUpdateBody(observacion)
  });

  observacionesSanitariasRepository.update(observacion.id, {
    syncStatus: "synced"
  });

  return { status: "synced", serverId: observacion.serverId };
}

export async function handleStepNote(entry: SyncOutboxItem): Promise<SyncHandlerResult> {
  const stepNote = visitaStepNotesRepository.getById(entry.entityLocalId);

  if (!stepNote) {
    return { status: "deleted_local" };
  }

  const visitaPadre = visitasCampoRepository.getById(stepNote.visitaId);

  if (!visitaPadre) {
    return { status: "deleted_local" };
  }

  if (visitaPadre.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!visitaPadre.serverId) {
    return { status: "skipped" };
  }

  const response = await observacionesSanitariasRemote.upsertStepNote(
    visitaPadre.serverId,
    stepNote.stepNumber,
    buildStepNoteBody(stepNote)
  );

  visitaStepNotesRepository.update(stepNote.id, {
    serverId: response.id,
    syncStatus: "synced"
  });

  return { status: "synced", serverId: response.id };
}

export async function handleRiego(entry: SyncOutboxItem): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    const serverId = getDeleteServerId(entry);

    if (!serverId) {
      return { status: "deleted_local" };
    }

    await riegosRemote.remove(serverId);
    return { status: "synced", serverId };
  }

  const riego = riegosRepository.getById(entry.entityLocalId);

  if (!riego) {
    return { status: "deleted_local" };
  }

  if (entry.operation === "create") {
    const visitaPadre = visitasCampoRepository.getById(riego.visitaId);

    if (!visitaPadre) {
      return { status: "deleted_local" };
    }

    if (visitaPadre.syncStatus === "error") {
      throw new Error("La visita padre no pudo sincronizarse.");
    }

    if (!visitaPadre.serverId) {
      return { status: "skipped" };
    }

    const response = await riegosRemote.create(visitaPadre.serverId, {
      ...buildRiegoBody(riego)
    });

    riegosRepository.update(riego.id, {
      serverId: response.id,
      syncStatus: "synced"
    });

    return { status: "synced", serverId: response.id };
  }

  const visitaPadreForUpdate = visitasCampoRepository.getById(riego.visitaId);

  if (visitaPadreForUpdate?.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!riego.serverId) {
    return { status: "skipped" };
  }

  await riegosRemote.update(riego.serverId, {
    ...buildRiegoBody(riego)
  });

  riegosRepository.update(riego.id, {
    syncStatus: "synced"
  });

  return { status: "synced", serverId: riego.serverId };
}

export async function handleLaborCultural(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    const serverId = getDeleteServerId(entry);

    if (!serverId) {
      return { status: "deleted_local" };
    }

    await laboresCulturalesVisitaRemote.remove(serverId);
    return { status: "synced", serverId };
  }

  const labor = laboresCulturalesVisitaRepository.getById(entry.entityLocalId);

  if (!labor) {
    return { status: "deleted_local" };
  }

  if (entry.operation === "update") {
    if (!labor.serverId) {
      return { status: "skipped" };
    }

    laboresCulturalesVisitaRepository.update(labor.id, {
      syncStatus: "synced"
    });

    return { status: "synced", serverId: labor.serverId };
  }

  const visitaPadre = visitasCampoRepository.getById(labor.visitaId);

  if (!visitaPadre) {
    return { status: "deleted_local" };
  }

  if (visitaPadre.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!visitaPadre.serverId) {
    return { status: "skipped" };
  }

  const response = await laboresCulturalesVisitaRemote.create(visitaPadre.serverId, {
    ...buildLaborCulturalBody(labor)
  });

  laboresCulturalesVisitaRepository.update(labor.id, {
    serverId: response.id,
    syncStatus: "synced"
  });

  return { status: "synced", serverId: response.id };
}

export const entityHandlerMap: Record<
  SyncEntityType,
  (entry: SyncOutboxItem) => Promise<SyncHandlerResult>
> = {
  visitas_campo: handleVisitaCampo,
  visita_evaluaciones: handleEvaluacion,
  visita_observaciones_sanitarias: handleObservacion,
  visita_paso_observaciones: handleStepNote,
  visita_riegos: handleRiego,
  visita_labores_culturales: handleLaborCultural,
  visita_recetas: handleReceta,
  visita_receta_fitosanidad: skipSyncHandler(),
  visita_receta_fertilizacion: skipSyncHandler(),
  visita_receta_riego: skipSyncHandler(),
  visita_receta_labores: skipSyncHandler(),
  visita_calificaciones: handleCalificacion
};

function buildVisitaCampoCreateBody(visita: VisitaCampo): CreateVisitaCampoDraft {
  return {
    publicId: visita.publicId,
    cropId: visita.cropId,
    varietyId: visita.varietyId,
    parcelaId: visita.parcelaId,
    campaignId: visita.campaignId,
    visitLocation: visita.visitLocation ?? undefined,
    plantsCount: visita.plantsCount ?? undefined,
    areaHectares: visita.areaHectares ?? undefined,
    sowingDate: visita.sowingDate ?? undefined,
    visitDate: visita.visitDate,
    startVisitTime: visita.startVisitTime,
    endVisitTime: visita.endVisitTime ?? undefined,
    phenologicalStageId: visita.phenologicalStageId ?? undefined,
    subEtapaId: visita.subEtapaId ?? undefined,
    subEtapaPercentage: visita.subEtapaPercentage ?? undefined,
    generalObservation: visita.generalObservation ?? undefined
  };
}

function buildVisitaCampoUpdateBody(
  visita: VisitaCampo
): Omit<CreateVisitaCampoDraft, "publicId"> {
  return {
    cropId: visita.cropId,
    varietyId: visita.varietyId,
    parcelaId: visita.parcelaId,
    campaignId: visita.campaignId,
    visitLocation: visita.visitLocation ?? undefined,
    plantsCount: visita.plantsCount ?? undefined,
    areaHectares: visita.areaHectares ?? undefined,
    sowingDate: visita.sowingDate ?? undefined,
    visitDate: visita.visitDate,
    startVisitTime: visita.startVisitTime,
    endVisitTime: visita.endVisitTime ?? undefined,
    phenologicalStageId: visita.phenologicalStageId ?? undefined,
    subEtapaId: visita.subEtapaId ?? undefined,
    subEtapaPercentage: visita.subEtapaPercentage ?? undefined,
    generalObservation: visita.generalObservation ?? undefined
  };
}

function ensureVisitaPublicId(visita: VisitaCampo) {
  if (isUuid(visita.publicId)) {
    return visita.publicId;
  }

  const publicId = generatePublicId();

  visitasCampoRepository.update(visita.id, {
    publicId,
    syncStatus: visita.syncStatus
  });

  return publicId;
}

function getDeleteServerId(entry: SyncOutboxItem) {
  if (!entry.payload) {
    return null;
  }

  try {
    const payload = JSON.parse(entry.payload) as { serverId?: string | null };
    return payload.serverId ?? null;
  } catch {
    return null;
  }
}

function buildEvaluacionCreateBody(evaluacion: VisitaEvaluacion) {
  return {
    order: evaluacion.order,
    incidencePercentage: toOptionalNumber(evaluacion.incidencePercentage),
    percentage: evaluacion.percentage ? Number(evaluacion.percentage) : undefined,
    description: evaluacion.description,
    organosAfectados: evaluacion.organosAfectados
  };
}

function buildEvaluacionUpdateBody(evaluacion: VisitaEvaluacion) {
  return {
    order: evaluacion.order,
    incidencePercentage: toOptionalNumber(evaluacion.incidencePercentage),
    percentage: evaluacion.percentage ? Number(evaluacion.percentage) : null,
    description: evaluacion.description,
    organosAfectados: evaluacion.organosAfectados
  };
}

function buildObservacionCreateBody(observacion: VisitaObservacionSanitaria) {
  return {
    pestDiseaseId: observacion.pestDiseaseId,
    incidenceLevelId: observacion.incidenceLevelId
      ? Number(observacion.incidenceLevelId)
      : null,
    severityLevelId: observacion.severityLevelId
      ? Number(observacion.severityLevelId)
      : null,
    incidencePercentage: toOptionalNumber(observacion.incidencePercentage),
    observation: observacion.observation ?? undefined,
    organosAfectados: observacion.organosAfectados
  };
}

function buildObservacionUpdateBody(observacion: VisitaObservacionSanitaria) {
  return {
    pestDiseaseId: observacion.pestDiseaseId,
    incidenceLevelId: observacion.incidenceLevelId
      ? Number(observacion.incidenceLevelId)
      : null,
    severityLevelId: observacion.severityLevelId
      ? Number(observacion.severityLevelId)
      : null,
    incidencePercentage: toOptionalNumber(observacion.incidencePercentage),
    observation: observacion.observation ?? null,
    organosAfectados: observacion.organosAfectados
  };
}

function toOptionalNumber(value: string | null) {
  return value === null ? null : Number(value);
}

function buildStepNoteBody(stepNote: VisitaStepNote) {
  return {
    observation: stepNote.observation ?? null,
    recommendation: stepNote.recommendation ?? null
  };
}

function buildRiegoBody(riego: VisitaRiego) {
  return {
    tipoRiegoId: Number(riego.tipoRiegoId),
    fuenteAgua: riego.fuenteAgua,
    tipoSuelo: riego.tipoSuelo,
    humedadSuelo: riego.humedadSuelo,
    estresHidrico: riego.estresHidrico
  };
}

function buildLaborCulturalBody(labor: VisitaLaborCultural) {
  return {
    laborCulturalId: Number(labor.laborCulturalId)
  };
}

async function handleReceta(entry: SyncOutboxItem): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    return { status: "deleted_local" };
  }

  const receta =
    visitaRecetasRepository.getRecetaByLocalId(entry.entityLocalId) ??
    visitaRecetasRepository.getRecetaByVisitaLocalId(entry.entityLocalId);

  if (!receta) {
    return { status: "deleted_local" };
  }

  const visitaPadre = visitasCampoRepository.getById(receta.visitaLocalId);

  if (!visitaPadre) {
    return { status: "deleted_local" };
  }

  if (visitaPadre.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!visitaPadre.serverId) {
    return { status: "skipped" };
  }

  const response = await visitaRecetasRemote.save(visitaPadre.serverId, {
    etapaFenologica: receta.etapaFenologica,
    fitosanidad: receta.fitosanidad.map((f) => ({
      numero: f.numero,
      objetivo: f.objetivo,
      objetivoNombre: f.objetivoNombre,
      tipoControlId: f.tipoControlId ? Number(f.tipoControlId) : undefined,
      tipoProductoId: f.tipoProductoId ? Number(f.tipoProductoId) : undefined,
      disolvente: f.disolvente,
      modoAccionId: f.modoAccionId ? Number(f.modoAccionId) : undefined,
      ingredienteActivoNombre: f.ingredienteActivoNombre ?? undefined,
      dosisIa: f.dosisIa ?? undefined,
      volumenAplicacion: f.volumenAplicacion ?? undefined,
      cantidadTotalIa: f.cantidadTotalIa ?? undefined,
      marcaProductoNombre: f.marcaProductoNombre ?? undefined,
      concentracionProducto: f.concentracionProducto ?? undefined,
      cantidadTotalProducto: f.cantidadTotalProducto ?? undefined,
      coadyuvantesIds: f.coadyuvantesIds ?? undefined,
      ordenMezcla: f.ordenMezcla ?? undefined
    })),
    fertilizacion: receta.fertilizacion.map((f) => ({
      viaAplicacion: f.viaAplicacion,
      fertilizanteNombre: f.fertilizanteNombre ?? undefined,
      tipoProducto: f.tipoProducto ?? undefined,
      dosis: f.dosis ?? undefined,
      unidadDosis: f.unidadDosis ?? undefined,
      cantidadTotalPlantas: f.cantidadTotalPlantas ?? undefined,
      volumenAplicacion: f.volumenAplicacion ?? undefined,
      cantidadTotalFertilizante: f.cantidadTotalFertilizante ?? undefined
    })),
    riego: receta.riego
      ? { tipoRecomendacion: receta.riego.tipoRecomendacion }
      : undefined,
    labores: receta.labores.map((l) => ({ labor: l.labor }))
  });

  visitaRecetasRepository.markSynced(receta.id, response.id);

  return { status: "synced", serverId: response.id };
}

async function handleCalificacion(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    return { status: "deleted_local" };
  }

  const calificacion = visitaCalificacionesRepository.getById(entry.entityLocalId);

  if (!calificacion) {
    return { status: "deleted_local" };
  }

  const visitaPadre = visitasCampoRepository.getById(calificacion.visitaId);

  if (!visitaPadre) {
    return { status: "deleted_local" };
  }

  if (visitaPadre.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!visitaPadre.serverId) {
    return { status: "skipped" };
  }

  const response = await visitaCalificacionesRemote.upsert(visitaPadre.serverId, {
    modulo: calificacion.modulo,
    puntaje: calificacion.puntaje,
    observacion: calificacion.observacion,
    justificado: calificacion.justificado,
    categoriaJustificacion: calificacion.categoriaJustificacion,
    motivoJustificacion: calificacion.motivoJustificacion
  });

  visitaCalificacionesRepository.update(calificacion.id, {
    serverId: response.id,
    syncStatus: "synced",
    syncErrorMessage: null
  });

  return { status: "synced", serverId: response.id };
}

function skipSyncHandler() {
  return async (): Promise<SyncHandlerResult> => {
    return { status: "skipped" };
  };
}
