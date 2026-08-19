import type { OrganoAfectado } from "../../observaciones-sanitarias/types";

export const DEFAULT_NUTRITION_ORGAN: OrganoAfectado = "hoja_tierna";

export function resolveNutritionOrganos(
  incidencePercentage: string,
  organosAfectados: OrganoAfectado[] | undefined
): OrganoAfectado[] {
  if (incidencePercentage === "") {
    return [];
  }

  return organosAfectados && organosAfectados.length > 0
    ? organosAfectados
    : [DEFAULT_NUTRITION_ORGAN];
}
