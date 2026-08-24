import type { PestDiseaseByStageItem } from "../types";

export function partitionPestDiseasesByStagePriority(
  items: readonly PestDiseaseByStageItem[]
) {
  return {
    common: items.filter((item) => item.isStageActive),
    optional: items.filter((item) => !item.isStageActive)
  };
}
