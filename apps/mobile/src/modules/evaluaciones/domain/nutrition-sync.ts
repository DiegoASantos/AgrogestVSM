import type { VisitaEvaluacion } from "../types";

type NutritionDeleteEntry = {
  entityType: string;
  operation: string;
  payload: string | null;
};

export function hasUnsyncedNutritionEvaluation(evaluations: VisitaEvaluacion[]): boolean {
  return evaluations.some(
    (evaluation) =>
      (evaluation.nutrientId !== null ||
        evaluation.description.startsWith("Nutricion -")) &&
      evaluation.syncStatus !== "synced"
  );
}

export function hasBlockedNutritionEvaluationDelete(
  visitaId: string,
  entries: NutritionDeleteEntry[],
  blockLegacyWithoutVisit = false
): boolean {
  return entries.some((entry) => {
    if (
      entry.entityType !== "visita_evaluaciones" ||
      entry.operation !== "delete" ||
      !entry.payload
    ) {
      return false;
    }

    try {
      const payload = JSON.parse(entry.payload) as {
        visitaId?: string;
        nutrientId?: string | null;
        description?: string;
      };

      if (!payload.visitaId) {
        return blockLegacyWithoutVisit;
      }

      return (
        payload.visitaId === visitaId &&
        (Boolean(payload.nutrientId) ||
          payload.description?.startsWith("Nutricion -") === true)
      );
    } catch {
      return false;
    }
  });
}

export function getLegacyEvaluationDeleteServerIds(
  entries: NutritionDeleteEntry[]
): string[] {
  const serverIds = new Set<string>();

  for (const entry of entries) {
    if (
      entry.entityType !== "visita_evaluaciones" ||
      entry.operation !== "delete" ||
      !entry.payload
    ) {
      continue;
    }

    try {
      const payload = JSON.parse(entry.payload) as {
        serverId?: string;
        visitaId?: string;
      };
      if (!payload.visitaId && payload.serverId) {
        serverIds.add(payload.serverId);
      }
    } catch {
      // Un payload ilegible no aporta un ID remoto verificable.
    }
  }

  return [...serverIds];
}

export function hasRemoteNutritionEvaluationForDelete(
  serverIds: Iterable<string>,
  evaluations: Array<Pick<VisitaEvaluacion, "id" | "nutrientId" | "description">>
): boolean {
  const expectedIds = new Set(serverIds);

  return evaluations.some(
    (evaluation) =>
      expectedIds.has(evaluation.id) &&
      (Boolean(evaluation.nutrientId) || evaluation.description.startsWith("Nutricion -"))
  );
}
