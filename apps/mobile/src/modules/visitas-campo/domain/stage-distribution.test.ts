import { describe, expect, it } from "vitest";

import type { EtapaFenologicaCatalogItem } from "../types";
import type { VisitPhenologicalStage } from "../types/visita-campo.types";
import { validateStageDistribution } from "./stage-distribution";

const catalog = [
  { id: "1", name: "Floración", type: "Etapa" },
  { id: "2", name: "Poda", type: "Labor" }
] as EtapaFenologicaCatalogItem[];

function entry(overrides: Partial<VisitPhenologicalStage> = {}): VisitPhenologicalStage {
  return {
    phenologicalStageId: "1",
    subEtapaId: "sub-1",
    coveragePercentage: 100,
    laborProgressPercentage: null,
    ...overrides
  };
}

describe("distribución de la parcela", () => {
  it("acepta una labor sola al 100%", () => {
    expect(validateStageDistribution([
      entry({ phenologicalStageId: "2", subEtapaId: null })
    ], catalog)).toBeNull();
  });

  it("acepta etapa y labor con coberturas que suman 100%", () => {
    expect(validateStageDistribution([
      entry({ coveragePercentage: 40 }),
      entry({ phenologicalStageId: "2", subEtapaId: null, coveragePercentage: 60 })
    ], catalog)).toBeNull();
  });

  it("rechaza cobertura incompleta, suma incorrecta y etapa sin subetapa", () => {
    expect(validateStageDistribution([
      entry({ coveragePercentage: 40 }),
      entry({ phenologicalStageId: "2", subEtapaId: null, coveragePercentage: null })
    ], catalog)).toContain("Poda");
    expect(validateStageDistribution([
      entry({ coveragePercentage: 40 }),
      entry({ phenologicalStageId: "2", subEtapaId: null, coveragePercentage: 50 })
    ], catalog)).toContain("90%");
    expect(validateStageDistribution([entry({ subEtapaId: null })], catalog)).toContain("subetapa");
  });
});
