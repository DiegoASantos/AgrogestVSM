import { describe, expect, it, vi } from "vitest";

import { TechnicalScoresService } from "./technical-scores.service";

function buildVisit(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    etapaFenologica: { name: "Floración" },
    observacionesSanitarias: [
      {
        plagaEnfermedad: { type: "enfermedad" },
        nivelIncidencia: { grade: 2 },
        nivelSeveridad: { grade: 1 }
      }
    ],
    evaluaciones: [{ description: "Nutricion - Zinc: Incidencia 10%", percentage: "1" }],
    riego: [{ estresHidrico: false, humedadSuelo: "optimo" }],
    labores: [
      ["weed_infestation", "clean"],
      ["soil_sanitary_status", "clean"],
      ["unproductive_branch_density", "low"],
      ["branch_break_risk", "low"],
      ["canopy_status", "good"],
      ["load_balance", "balanced"]
    ].map(([categoryCode, optionCode]) => ({
      laborCultural: { categoryCode, optionCode }
    })),
    ...overrides
  };
}

function buildRecipeRepository(hasRecipe = false) {
  return { findOne: vi.fn().mockResolvedValue(hasRecipe ? { id: "recipe-1" } : null) };
}

describe("TechnicalScoresService", () => {
  it("separa los módulos técnicos y pondera solo sus valores disponibles", async () => {
    const visits = { findOne: vi.fn().mockResolvedValue(buildVisit()) };
    const pestScores = { resolveVisitScore: vi.fn().mockResolvedValue({ score: 3 }) };
    const diseaseScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 1, detail: null })
    };
    const nutritionScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 2, detail: null })
    };
    const service = new TechnicalScoresService(
      visits as never,
      pestScores as never,
      diseaseScores as never,
      nutritionScores as never,
      buildRecipeRepository() as never
    );

    const response = await service.byVisit("1");

    expect(response.data.scorePorModulo).toMatchObject({
      plagas: { percentage: 100 },
      enfermedades: { score: 1, percentage: 33.33 },
      nutricion: { score: 2, percentage: 66.67 },
      riego: { score: 3, percentage: 100 },
      labores: { score: 3, percentage: 100 }
    });
    expect(response.data.scoreTecnicoGeneral).toBe(81.67);
    expect(response.data.modulosFaltantes).toEqual([]);
  });

  it("renormaliza sin inventar módulos no registrados", async () => {
    const visits = {
      findOne: vi.fn().mockResolvedValue(
        buildVisit({
          observacionesSanitarias: [],
          evaluaciones: [],
          labores: [],
          riego: [{ estresHidrico: false, humedadSuelo: "optimo" }]
        })
      )
    };
    const pestScores = { resolveVisitScore: vi.fn().mockResolvedValue({ score: null }) };
    const diseaseScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: null, detail: null })
    };
    const nutritionScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: null, detail: null })
    };
    const service = new TechnicalScoresService(
      visits as never,
      pestScores as never,
      diseaseScores as never,
      nutritionScores as never,
      buildRecipeRepository() as never
    );

    const response = await service.byVisit("1");

    expect(response.data.scoreTecnicoGeneral).toBe(100);
    expect(response.data.modulosIncluidos).toEqual(["riego"]);
    expect(response.data.modulosFaltantes).toHaveLength(4);
  });

  it("publica score 3 en los módulos sin hallazgos cuando existe una receta", async () => {
    const visits = {
      findOne: vi.fn().mockResolvedValue(buildVisit({ riego: [], labores: [] }))
    };
    const pestScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
    };
    const diseaseScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
    };
    const nutritionScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
    };
    const service = new TechnicalScoresService(
      visits as never,
      pestScores as never,
      diseaseScores as never,
      nutritionScores as never,
      buildRecipeRepository(true) as never
    );

    const response = await service.byVisit("1");

    expect(response.data.scorePorModulo).toMatchObject({
      plagas: { score: 3 },
      enfermedades: { score: 3 },
      nutricion: { score: 3 },
      riego: { score: 3, semaphore: "verde" }
    });
    expect(response.data.detalleRiego).toMatchObject({ moduleScore: 3 });
    expect(pestScores.resolveVisitScore).toHaveBeenCalledWith("1", true);
    expect(diseaseScores.resolveVisitScore).toHaveBeenCalledWith("1", true);
    expect(nutritionScores.resolveVisitScore).toHaveBeenCalledWith("1", true);
  });

  it.each([
    [0, "rojo"],
    [1, "amarillo"],
    [2, "verde"],
    [3, "verde"]
  ] as const)("mapea el score Plagas %i al semáforo %s", async (score, semaphore) => {
    const visits = { findOne: vi.fn().mockResolvedValue(buildVisit()) };
    const detail = { moduleScore: score, semaphore };
    const pestScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score, detail })
    };
    const diseaseScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
    };
    const nutritionScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
    };
    const service = new TechnicalScoresService(
      visits as never,
      pestScores as never,
      diseaseScores as never,
      nutritionScores as never,
      buildRecipeRepository() as never
    );

    const response = await service.byVisit("1");

    expect(response.data.scorePorModulo.plagas.semaphore).toBe(semaphore);
    expect(response.data.detallePlagas).toBe(detail);
  });

  it.each([
    [0, "rojo"],
    [1, "amarillo"],
    [2, "verde"],
    [3, "verde"]
  ] as const)(
    "mapea el score Enfermedades %i al semáforo %s",
    async (score, semaphore) => {
      const visits = { findOne: vi.fn().mockResolvedValue(buildVisit()) };
      const detail = { moduleScore: score, semaphore };
      const pestScores = {
        resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
      };
      const diseaseScores = {
        resolveVisitScore: vi.fn().mockResolvedValue({ score, detail })
      };
      const nutritionScores = {
        resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
      };
      const service = new TechnicalScoresService(
        visits as never,
        pestScores as never,
        diseaseScores as never,
        nutritionScores as never,
        buildRecipeRepository() as never
      );

      const response = await service.byVisit("1");

      expect(response.data.scorePorModulo.enfermedades.semaphore).toBe(semaphore);
      expect(response.data.detalleEnfermedades).toBe(detail);
    }
  );

  it.each([
    [0, "rojo"],
    [1, "amarillo"],
    [2, "verde"],
    [3, "verde"]
  ] as const)("mapea el score Nutrición %i al semáforo %s", async (score, semaphore) => {
    const visits = { findOne: vi.fn().mockResolvedValue(buildVisit()) };
    const detail = { moduleScore: score, semaphore };
    const pestScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
    };
    const diseaseScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score: 3, detail: null })
    };
    const nutritionScores = {
      resolveVisitScore: vi.fn().mockResolvedValue({ score, detail })
    };
    const service = new TechnicalScoresService(
      visits as never,
      pestScores as never,
      diseaseScores as never,
      nutritionScores as never,
      buildRecipeRepository() as never
    );

    const response = await service.byVisit("1");

    expect(response.data.scorePorModulo.nutricion.semaphore).toBe(semaphore);
    expect(response.data.detalleNutricion).toBe(detail);
  });
});
