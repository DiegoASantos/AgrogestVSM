import type { LaborCulturalCatalogItem } from "../types";

const DEFAULT_OPTION_BY_CATEGORY: Record<string, string> = {
  weed_infestation: "clean",
  soil_sanitary_status: "clean",
  unproductive_branch_density: "low",
  branch_break_risk: "low",
  canopy_status: "good",
  load_balance: "balanced"
};

export function getDefaultLaborSelectionIds(items: LaborCulturalCatalogItem[]) {
  return new Set(
    items
      .filter(
        (item) =>
          item.categoryCode !== null &&
          item.optionCode === DEFAULT_OPTION_BY_CATEGORY[item.categoryCode]
      )
      .map((item) => item.id)
  );
}