import { describe, expect, it } from "vitest";

import type { PestDiseaseByStageItem } from "../types";
import { partitionPestDiseasesByStagePriority } from "./stage-priority";

function item(id: string, isStageActive: boolean) {
  return {
    id,
    code: id,
    scientificName: null,
    name: id,
    type: "plaga",
    isActive: true,
    isStageActive,
    stageLevels: []
  } satisfies PestDiseaseByStageItem;
}

describe("prioridad sanitaria por etapa", () => {
  it("separa los objetivos comunes de los opcionales sin descartarlos", () => {
    const result = partitionPestDiseasesByStagePriority([
      item("trips", true),
      item("mosca_fruta", false),
      item("cochinilla", true)
    ]);

    expect(result.common.map((value) => value.id)).toEqual(["trips", "cochinilla"]);
    expect(result.optional.map((value) => value.id)).toEqual(["mosca_fruta"]);
  });
});
