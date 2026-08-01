import { describe, expect, it } from "vitest";

import type { IncidenceLevelCatalogItem, PestDiseaseByStageItem } from "../types";
import { getLevelOptionsForItem } from "./stage-level-options";

const severityLevels = [
  { id: "severity-1", name: "Leve", sortOrder: 1, grade: 1, type: "severidad" },
  { id: "severity-2", name: "Alta", sortOrder: 2, grade: 3, type: "severidad" }
] satisfies IncidenceLevelCatalogItem[];

function catalogItem(type: "plaga" | "enfermedad", levelIds: string[]) {
  return {
    id: `${type}-1`,
    name: type,
    scientificName: null,
    type,
    isActive: true,
    stageLevels: levelIds.map((nivelIncidenciaSeveridadId, index) => ({
      id: `relation-${index}`,
      plagaEnfermedadId: `${type}-1`,
      etapaFenologicaId: "stage-1",
      nivelIncidenciaSeveridadId,
      description: null,
      isActive: true
    }))
  } satisfies PestDiseaseByStageItem;
}

describe("niveles sanitarios por etapa", () => {
  it("no ofrece severidades globales a una enfermedad sin configuración", () => {
    expect(
      getLevelOptionsForItem(catalogItem("enfermedad", []), severityLevels, "severidad")
    ).toEqual([]);
  });

  it("limita la enfermedad a sus severidades configuradas", () => {
    expect(
      getLevelOptionsForItem(
        catalogItem("enfermedad", ["severity-2"]),
        severityLevels,
        "severidad"
      ).map((item) => item.id)
    ).toEqual(["severity-2"]);
  });

  it("preserva el fallback legado de plagas", () => {
    expect(
      getLevelOptionsForItem(catalogItem("plaga", []), severityLevels, "severidad")
    ).toEqual(severityLevels);
  });
});
