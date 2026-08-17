import type { RecommendationApproach } from "../types";

export function normalizeRecommendationApproach(
  approach: RecommendationApproach | null | undefined
): RecommendationApproach {
  return approach === "preventivo" ? "preventivo" : "reactivo";
}

export function formatRecommendationApproach(
  approach: RecommendationApproach | null | undefined,
  includePreventiveGrades = false
) {
  if (normalizeRecommendationApproach(approach) === "reactivo") {
    return "Reactivo";
  }
  return includePreventiveGrades
    ? "Preventivo · Incidencia grado 0 · Severidad grado 0"
    : "Preventivo";
}
