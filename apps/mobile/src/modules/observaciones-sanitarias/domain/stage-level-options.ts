import type { IncidenceLevelCatalogItem, PestDiseaseByStageItem } from "../types";

export function getLevelOptionsForItem(
  item: PestDiseaseByStageItem,
  incidenceLevels: IncidenceLevelCatalogItem[],
  type: IncidenceLevelCatalogItem["type"]
) {
  const levelIds = new Set(
    item.stageLevels.map((relation) => relation.nivelIncidenciaSeveridadId)
  );
  const typedLevels = incidenceLevels.filter((level) => level.type === type);
  const stageLevels = typedLevels.filter((level) => levelIds.has(level.id));
  if (item.type.toLowerCase() === "enfermedad" && type === "incidencia") {
    return typedLevels.sort((left, right) => left.sortOrder - right.sortOrder);
  }
  const availableLevels =
    stageLevels.length > 0 || item.type.toLowerCase() === "enfermedad"
      ? stageLevels
      : typedLevels;

  return availableLevels.sort((left, right) => left.sortOrder - right.sortOrder);
}
