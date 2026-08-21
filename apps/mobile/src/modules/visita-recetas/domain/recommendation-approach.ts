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
    return "Curativo";
  }
  return includePreventiveGrades
    ? "Preventivo · Incidencia grado 0 · Severidad grado 0"
    : "Preventivo";
}

export function formatFertilizationTarget(
  approach: RecommendationApproach | null | undefined,
  nutrientId: string | null | undefined,
  nutrientName: string | null | undefined
) {
  const normalizedName = nutrientName?.trim();
  if (normalizedName) return normalizedName;

  return normalizeRecommendationApproach(approach) === "preventivo" && !nutrientId
    ? "Fertilización general"
    : "Deficiencia no registrada";
}
