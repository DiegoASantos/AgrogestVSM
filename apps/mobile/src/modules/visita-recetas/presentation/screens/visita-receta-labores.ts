import type { RecetaLabor } from "../../types";

export const PRUNING_RECOMMENDATIONS = [
  "poda_formacion",
  "poda_saneamiento",
  "poda_aclareo_iluminacion",
  "poda_rejuvenecimiento_severa"
] as const satisfies readonly RecetaLabor["labor"][];

const PRUNING_RECOMMENDATION_SET = new Set<string>(PRUNING_RECOMMENDATIONS);

export function toggleLaborRecommendation(selected: ReadonlySet<string>, labor: string) {
  const next = new Set(selected);

  if (next.has(labor)) {
    next.delete(labor);
    return next;
  }

  if (PRUNING_RECOMMENDATION_SET.has(labor)) {
    for (const pruning of PRUNING_RECOMMENDATIONS) {
      next.delete(pruning);
    }
  }

  next.add(labor);
  return next;
}
