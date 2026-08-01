import { describe, expect, it, vi } from "vitest";

import {
  resolveNutritionSemaphore,
  ScoreTecnicoNutricionService
} from "./score-tecnico-nutricion.service";

function buildService(options: {
  finalized?: boolean;
  evaluations?: Array<Record<string, unknown>>;
}) {
  const visits = {
    findOne: vi.fn().mockResolvedValue({ id: "visit-1", isActive: true })
  };
  const steps = {
    findOne: vi
      .fn()
      .mockResolvedValue(
        options.finalized === false
          ? null
          : { visitaId: "visit-1", stepNumber: 4, finalizedAt: new Date() }
      )
  };
  const evaluations = {
    find: vi.fn().mockResolvedValue(options.evaluations ?? [])
  };

  return new ScoreTecnicoNutricionService(
    visits as never,
    steps as never,
    evaluations as never
  );
}

function nutritionEvaluation(code: string, percentage: number) {
  return {
    nutrientId: `nutrient-${code}`,
    incidencePercentage: String(percentage),
    description: `Nutricion - ${code}: ${percentage}%`,
    nutrient: { code }
  };
}

describe("ScoreTecnicoNutricionService", () => {
  it("consolida seis nutrientes y asigna nota 3 a los no evaluados", async () => {
    const result = await buildService({
      evaluations: [nutritionEvaluation("magnesio", 12)]
    }).resolveVisitScore("visit-1");

    expect(result.score).toBe(1);
    expect(result.detail?.appliedFormula).toBe(
      "ScoreNutricion = MIN(3, 1, 3, 3, 3, 3) = 1"
    );
    expect(result.detail?.nutritionScores).toHaveLength(6);
    expect(result.detail?.nutritionScores[1]).toMatchObject({
      key: "magnesio",
      evaluated: true,
      incidencePercentage: 12,
      incidenceGrade: 2,
      score: 1,
      formula: "NotaNutricion = 3 - 2 = 1"
    });
    expect(result.detail?.nutritionScores.filter((item) => !item.evaluated)).toEqual(
      expect.arrayContaining([expect.objectContaining({ score: 3 })])
    );
  });

  it("devuelve score 3 si el paso finalizó sin deficiencias evaluadas", async () => {
    const result = await buildService({}).resolveVisitScore("visit-1");

    expect(result.score).toBe(3);
    expect(result.detail?.appliedFormula).toBe(
      "ScoreNutricion = MIN(3, 3, 3, 3, 3, 3) = 3"
    );
    expect(result.detail?.semaphore).toBe("verde");
  });

  it("no calcula el módulo antes de finalizar el paso de Nutrición", async () => {
    const result = await buildService({ finalized: false }).resolveVisitScore("visit-1");

    expect(result).toEqual({
      finalized: false,
      score: null,
      percentage: null,
      detail: null
    });
  });

  it("mantiene compatibilidad con registros históricos identificados por descripción", async () => {
    const result = await buildService({
      evaluations: [
        {
          nutrientId: null,
          nutrient: null,
          incidencePercentage: "4",
          description: "Nutricion - Zinc: Incidencia 4%"
        }
      ]
    }).resolveVisitScore("visit-1");

    expect(result.detail?.nutritionScores[4]).toMatchObject({
      key: "zinc",
      evaluated: true,
      incidenceGrade: 1,
      score: 2
    });
  });

  it.each([
    [0, "rojo", "Deficiencia Crítica / Riesgo de Rendimiento"],
    [1, "amarillo", "Alerta de Bloqueo Nutricional"],
    [2, "verde", "Fundo Nutrito / Salud Fuerte"],
    [3, "verde", "Fundo Nutrito / Salud Fuerte"]
  ] as const)("mapea el score %i al semáforo %s", (score, semaphore, status) => {
    expect(resolveNutritionSemaphore(score)).toMatchObject({ semaphore, status });
  });
});
