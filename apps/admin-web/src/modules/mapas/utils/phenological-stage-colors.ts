import type { PhenologicalStageMapItem } from "../types/mapas.types";

const PHENOLOGICAL_STAGE_COLORS = [
  "#0072b2",
  "#d55e00",
  "#009e73",
  "#cc79a7",
  "#56b4e9",
  "#e69f00",
  "#6a3d9a",
  "#4d4d4d"
] as const;

export function buildPhenologicalStageColorLookup(
  stages: PhenologicalStageMapItem[]
) {
  return new Map(
    stages.map((stage, index) => [
      stage.id,
      PHENOLOGICAL_STAGE_COLORS[index % PHENOLOGICAL_STAGE_COLORS.length]
    ])
  );
}
