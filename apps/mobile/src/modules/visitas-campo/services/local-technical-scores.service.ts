import { getDatabase } from "../../../shared/database/connection";
import { nutricionRepository } from "../../nutricion/repositories/nutricion.repository";
import { evaluacionesRemote } from "../../evaluaciones/services/evaluaciones.remote";
import { laboresCulturalesVisitaRepository } from "../../labores-culturales-visita/repositories/labores-culturales-visita.repository";
import { observacionesSanitariasRepository } from "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository";
import { observacionesSanitariasRemote } from "../../observaciones-sanitarias/services/observaciones-sanitarias.remote";
import { parcelasRepository } from "../../parcelas/repositories/parcelas.repository";
import { riegosRemote } from "../../riegos/services/riegos.remote";
import { visitaRecetasRepository } from "../../visita-recetas/repositories/visita-recetas.repository";
import { calculateLocalTechnicalScores } from "../domain/local-technical-scores";
import type {
  MobileTechnicalScoreDetails,
  TechnicalVisitScores,
  VisitaCampoFull
} from "../types";

export type LocalTechnicalScoreResult = {
  scores: MobileTechnicalScoreDetails;
  pendingSync: boolean;
  legacyDeletes: LegacyTechnicalDelete[];
};

export type LegacyTechnicalDelete = {
  entityType: "visita_observaciones_sanitarias" | "visita_evaluaciones" | "visita_riegos";
  serverId: string;
};

export const localTechnicalScoresService = {
  calculate(detail: VisitaCampoFull): LocalTechnicalScoreResult {
    const pestDiseases = observacionesSanitariasRepository.getPestDiseases();
    const incidenceLevels = observacionesSanitariasRepository.getIncidenceLevels();
    const nutrients = nutricionRepository.getNutrientsByCrop(detail.visita.cropId);
    const recipe = visitaRecetasRepository.getRecetaByVisitaLocalId(detail.visita.id);
    const pestDiseaseById = new Map(pestDiseases.map((item) => [item.id, item]));
    const incidenceGradeById = new Map(
      incidenceLevels.map((item) => [item.id, item.grade])
    );
    const nutrientById = new Map(nutrients.map((item) => [item.id, item]));
    const nutritionEvaluations = detail.evaluaciones.filter(
      (evaluation) =>
        evaluation.nutrientId !== null || evaluation.description.startsWith("Nutricion -")
    );

    const deleteState = getTechnicalDeleteState(detail.visita.id);

    return {
      scores: calculateLocalTechnicalScores({
        technicalScoreVersion: detail.visita.technicalScoreVersion ?? 1,
        isActive: detail.visita.isActive,
        hasRecipe: recipe !== null,
        finalizedSteps: detail.stepNotes
          .filter((stepNote) => Boolean(stepNote.finalizedAt))
          .map((stepNote) => stepNote.stepNumber),
        departmentCode: parcelasRepository.getDepartmentCodeById(detail.visita.parcelaId),
        sanitaryObservations: detail.observacionesSanitarias.flatMap((observation) => {
          const pestDisease = pestDiseaseById.get(observation.pestDiseaseId);
          if (!pestDisease) return [];
          return [
            {
              pestDiseaseId: observation.pestDiseaseId,
              code: pestDisease.code,
              name: pestDisease.name,
              type: pestDisease.type,
              incidenceGrade:
                (observation.incidenceLevelId
                  ? incidenceGradeById.get(observation.incidenceLevelId)
                  : undefined) ?? 0,
              severityGrade:
                (observation.severityLevelId
                  ? incidenceGradeById.get(observation.severityLevelId)
                  : undefined) ?? 0,
              incidencePercentage: toNumber(observation.incidencePercentage)
            }
          ];
        }),
        nutritionObservations: nutritionEvaluations.map((evaluation) => {
          const nutrient = evaluation.nutrientId
            ? nutrientById.get(evaluation.nutrientId)
            : undefined;
          return {
            nutrientId: evaluation.nutrientId,
            code: nutrient?.code ?? null,
            name: nutrient?.name ?? "",
            description: evaluation.description,
            incidencePercentage: toNumber(evaluation.incidencePercentage)
          };
        }),
        riego: detail.riego
          ? {
              humedadSuelo: detail.riego.humedadSuelo,
              estresHidrico: detail.riego.estresHidrico
            }
          : null,
        labores: laboresCulturalesVisitaRepository
          .getLaboresCulturales()
          .filter((catalog) =>
            detail.laboresCulturales.some((vlc) => vlc.laborCulturalId === catalog.id)
          )
          .map((catalog) => ({
            categoryCode: catalog.categoryCode,
            categoryName: catalog.categoryName,
            optionCode: catalog.optionCode,
            optionName: catalog.optionLabel
          }))
      }),
      pendingSync:
        hasPendingTechnicalData(detail, recipe, nutritionEvaluations) ||
        deleteState.pendingForVisit,
      legacyDeletes: deleteState.legacyDeletes
    };
  }
};

export async function hasLegacyTechnicalDeleteForVisit(
  visitaServerId: string,
  deletes: LegacyTechnicalDelete[]
) {
  if (deletes.length === 0) return false;

  const observationIds = new Set(
    deletes
      .filter((item) => item.entityType === "visita_observaciones_sanitarias")
      .map((item) => item.serverId)
  );
  const evaluationIds = new Set(
    deletes
      .filter((item) => item.entityType === "visita_evaluaciones")
      .map((item) => item.serverId)
  );
  const riegoIds = new Set(
    deletes
      .filter((item) => item.entityType === "visita_riegos")
      .map((item) => item.serverId)
  );

  try {
    const [observations, evaluations, riego] = await Promise.all([
      observationIds.size > 0
        ? observacionesSanitariasRemote.getByVisitaId(visitaServerId)
        : Promise.resolve([]),
      evaluationIds.size > 0
        ? evaluacionesRemote.getByVisitaId(visitaServerId)
        : Promise.resolve([]),
      riegoIds.size > 0
        ? riegosRemote.getByVisitaId(visitaServerId)
        : Promise.resolve(null)
    ]);

    return (
      observations.some((item) => observationIds.has(item.id)) ||
      evaluations.some((item) => evaluationIds.has(item.id)) ||
      (riego !== null && riegoIds.has(riego.id))
    );
  } catch {
    return true;
  }
}

export function shouldConfirmTechnicalScoresFromServer(
  serverId: string | null,
  pendingSync: boolean
) {
  return Boolean(serverId) && !pendingSync;
}

export function pickMobileTechnicalScoreDetails(
  scores: TechnicalVisitScores
): MobileTechnicalScoreDetails {
  return {
    detallePlagas: scores.detallePlagas,
    detalleEnfermedades: scores.detalleEnfermedades,
    detalleNutricion: scores.detalleNutricion,
    detalleRiego: scores.detalleRiego,
    detalleLabores: scores.detalleLabores
  };
}

function hasPendingTechnicalData(
  detail: VisitaCampoFull,
  recipe: ReturnType<typeof visitaRecetasRepository.getRecetaByVisitaLocalId>,
  nutritionEvaluations: VisitaCampoFull["evaluaciones"]
) {
  const statuses = [
    detail.visita.syncStatus,
    ...detail.observacionesSanitarias.map((item) => item.syncStatus),
    ...nutritionEvaluations.map((item) => item.syncStatus),
    ...detail.stepNotes
      .filter((item) => item.stepNumber >= 2 && item.stepNumber <= 5)
      .map((item) => item.syncStatus),
    ...(detail.riego ? [detail.riego.syncStatus] : []),
    ...(recipe
      ? [
          recipe.syncStatus,
          ...recipe.fitosanidad.map((item) => item.syncStatus),
          ...recipe.fertilizacion.map((item) => item.syncStatus),
          ...(recipe.riego ? [recipe.riego.syncStatus] : []),
          ...recipe.labores.map((item) => item.syncStatus)
        ]
      : [])
  ];

  return statuses.some((status) => status !== "synced");
}

function getTechnicalDeleteState(visitaId: string) {
  const entries = getDatabase().getAllSync<{
    entity_type: string;
    payload: string | null;
  }>(
    `SELECT entity_type, payload
     FROM sync_outbox
     WHERE operation = 'delete'
       AND entity_type IN (
         'visita_observaciones_sanitarias',
         'visita_evaluaciones',
         'visita_riegos'
       )
     UNION ALL
     SELECT entity_type, payload
     FROM sync_failures
     WHERE operation = 'delete'
       AND entity_type IN (
         'visita_observaciones_sanitarias',
         'visita_evaluaciones',
         'visita_riegos'
       )`
  );

  let pendingForVisit = false;
  const legacyDeletes: LegacyTechnicalDelete[] = [];

  for (const entry of entries) {
    if (!entry.payload) continue;
    try {
      const payload = JSON.parse(entry.payload) as {
        visitaId?: string;
        serverId?: string;
      };
      if (payload.visitaId === visitaId) {
        pendingForVisit = true;
      } else if (
        !payload.visitaId &&
        payload.serverId &&
        isTechnicalEntity(entry.entity_type)
      ) {
        legacyDeletes.push({
          entityType: entry.entity_type,
          serverId: payload.serverId
        });
      }
    } catch {
      // Un payload ilegible no ofrece identidad verificable para atribuirlo.
    }
  }

  return { pendingForVisit, legacyDeletes };
}

function isTechnicalEntity(
  entityType: string
): entityType is LegacyTechnicalDelete["entityType"] {
  return (
    entityType === "visita_observaciones_sanitarias" ||
    entityType === "visita_evaluaciones" ||
    entityType === "visita_riegos"
  );
}

function toNumber(value: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
