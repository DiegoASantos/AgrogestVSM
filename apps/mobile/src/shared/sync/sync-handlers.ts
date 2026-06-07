import { evaluacionesRepository } from "../../modules/evaluaciones/repositories/evaluaciones.repository";
import { evaluacionesRemote } from "../../modules/evaluaciones/services/evaluaciones.remote";
import type { VisitaEvaluacion } from "../../modules/evaluaciones/types";
import { observacionesSanitariasRepository } from "../../modules/observaciones-sanitarias/repositories/observaciones-sanitarias.repository";
import { visitaStepNotesRepository } from "../../modules/observaciones-sanitarias/repositories/visita-step-notes.repository";
import { observacionesSanitariasRemote } from "../../modules/observaciones-sanitarias/services/observaciones-sanitarias.remote";
import type {
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../modules/observaciones-sanitarias/types";
import { productosRecomendadosRepository } from "../../modules/productos-recomendados/repositories/productos-recomendados.repository";
import { productosRecomendadosRemote } from "../../modules/productos-recomendados/services/productos-recomendados.remote";
import type { VisitaProductoRecomendado } from "../../modules/productos-recomendados/types";
import { recomendacionesRepository } from "../../modules/recomendaciones/repositories/recomendaciones.repository";
import { recomendacionesRemote } from "../../modules/recomendaciones/services/recomendaciones.remote";
import type { VisitaRecomendacion } from "../../modules/recomendaciones/types";
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
import {
  generatePublicId,
  isUuid
} from "../utils/local-id";

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

    await visitasCampoRemote.update(
      visita.serverId,
      buildVisitaCampoUpdateBody(visita)
    );

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

  const observacion = observacionesSanitariasRepository.getById(
    entry.entityLocalId
  );

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

    const response = await observacionesSanitariasRemote.create(
      visitaPadre.serverId,
      {
        ...buildObservacionCreateBody(observacion)
      }
    );

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

export async function handleStepNote(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
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

export async function handleRecomendacion(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    const serverId = getDeleteServerId(entry);

    if (!serverId) {
      return { status: "deleted_local" };
    }

    await recomendacionesRemote.remove(serverId);
    return { status: "synced", serverId };
  }

  const recomendacion = recomendacionesRepository.getById(entry.entityLocalId);

  if (!recomendacion) {
    return { status: "deleted_local" };
  }

  if (entry.operation === "create") {
    const visitaPadre = visitasCampoRepository.getById(recomendacion.visitaId);

    if (!visitaPadre) {
      return { status: "deleted_local" };
    }

    if (visitaPadre.syncStatus === "error") {
      throw new Error("La visita padre no pudo sincronizarse.");
    }

    if (!visitaPadre.serverId) {
      return { status: "skipped" };
    }

    const response = await recomendacionesRemote.create(visitaPadre.serverId, {
      ...buildRecomendacionCreateBody(recomendacion)
    });

    recomendacionesRepository.update(recomendacion.id, {
      serverId: response.id,
      syncStatus: "synced"
    });

    return { status: "synced", serverId: response.id };
  }

  const visitaPadreForUpdate = visitasCampoRepository.getById(
    recomendacion.visitaId
  );

  if (visitaPadreForUpdate?.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!recomendacion.serverId) {
    return { status: "skipped" };
  }

  await recomendacionesRemote.update(recomendacion.serverId, {
    ...buildRecomendacionUpdateBody(recomendacion)
  });

  recomendacionesRepository.update(recomendacion.id, {
    syncStatus: "synced"
  });

  return { status: "synced", serverId: recomendacion.serverId };
}

export async function handleProducto(
  entry: SyncOutboxItem
): Promise<SyncHandlerResult> {
  if (entry.operation === "delete") {
    const serverId = getDeleteServerId(entry);

    if (!serverId) {
      return { status: "deleted_local" };
    }

    await productosRecomendadosRemote.remove(serverId);
    return { status: "synced", serverId };
  }

  const producto = productosRecomendadosRepository.getById(entry.entityLocalId);

  if (!producto) {
    return { status: "deleted_local" };
  }

  if (entry.operation === "create") {
    const visitaPadre = visitasCampoRepository.getById(producto.visitaId);

    if (!visitaPadre) {
      return { status: "deleted_local" };
    }

    if (visitaPadre.syncStatus === "error") {
      throw new Error("La visita padre no pudo sincronizarse.");
    }

    if (!visitaPadre.serverId) {
      return { status: "skipped" };
    }

    const response = await productosRecomendadosRemote.create(
      visitaPadre.serverId,
      {
        ...buildProductoCreateBody(producto)
      }
    );

    productosRecomendadosRepository.update(producto.id, {
      serverId: response.id,
      syncStatus: "synced"
    });

    return { status: "synced", serverId: response.id };
  }

  const visitaPadreForUpdate = visitasCampoRepository.getById(producto.visitaId);

  if (visitaPadreForUpdate?.syncStatus === "error") {
    throw new Error("La visita padre no pudo sincronizarse.");
  }

  if (!producto.serverId) {
    return { status: "skipped" };
  }

  await productosRecomendadosRemote.update(producto.serverId, {
    ...buildProductoUpdateBody(producto)
  });

  productosRecomendadosRepository.update(producto.id, {
    syncStatus: "synced"
  });

  return { status: "synced", serverId: producto.serverId };
}

export const entityHandlerMap: Record<
  SyncEntityType,
  (entry: SyncOutboxItem) => Promise<SyncHandlerResult>
> = {
  visitas_campo: handleVisitaCampo,
  visita_evaluaciones: handleEvaluacion,
  visita_observaciones_sanitarias: handleObservacion,
  visita_paso_observaciones: handleStepNote,
  visita_recomendaciones: handleRecomendacion,
  visita_productos_recomendados: handleProducto
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
    percentage: evaluacion.percentage ? Number(evaluacion.percentage) : undefined,
    description: evaluacion.description
  };
}

function buildEvaluacionUpdateBody(evaluacion: VisitaEvaluacion) {
  return {
    order: evaluacion.order,
    percentage: evaluacion.percentage ? Number(evaluacion.percentage) : null,
    description: evaluacion.description
  };
}

function buildObservacionCreateBody(
  observacion: VisitaObservacionSanitaria
) {
  return {
    pestDiseaseId: observacion.pestDiseaseId,
    incidenceLevelId: observacion.incidenceLevelId
      ? Number(observacion.incidenceLevelId)
      : null,
    severityLevelId: observacion.severityLevelId
      ? Number(observacion.severityLevelId)
      : null,
    observation: observacion.observation ?? undefined
  };
}

function buildObservacionUpdateBody(
  observacion: VisitaObservacionSanitaria
) {
  return {
    pestDiseaseId: observacion.pestDiseaseId,
    incidenceLevelId: observacion.incidenceLevelId
      ? Number(observacion.incidenceLevelId)
      : null,
    severityLevelId: observacion.severityLevelId
      ? Number(observacion.severityLevelId)
      : null,
    observation: observacion.observation ?? null
  };
}

function buildStepNoteBody(stepNote: VisitaStepNote) {
  return {
    observation: stepNote.observation ?? null,
    recommendation: stepNote.recommendation ?? null
  };
}

function buildRecomendacionCreateBody(
  recomendacion: VisitaRecomendacion
) {
  return {
    recommendationTypeId: recomendacion.recommendationTypeId,
    applies: recomendacion.applies,
    detail: recomendacion.detail ?? undefined
  };
}

function buildRecomendacionUpdateBody(
  recomendacion: VisitaRecomendacion
) {
  return {
    recommendationTypeId: recomendacion.recommendationTypeId,
    applies: recomendacion.applies,
    detail: recomendacion.detail ?? null
  };
}

function buildProductoCreateBody(
  producto: VisitaProductoRecomendado
) {
  return {
    productId: producto.productId,
    dose: producto.dose,
    applicationFrequencyId: producto.applicationFrequencyId ?? undefined,
    instructions: producto.instructions ?? undefined
  };
}

function buildProductoUpdateBody(
  producto: VisitaProductoRecomendado
) {
  return {
    productId: producto.productId,
    dose: producto.dose,
    applicationFrequencyId: producto.applicationFrequencyId ?? null,
    instructions: producto.instructions ?? null
  };
}
