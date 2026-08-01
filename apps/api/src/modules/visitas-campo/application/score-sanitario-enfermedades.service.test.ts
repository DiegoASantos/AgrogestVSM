import { describe, expect, it, vi } from "vitest";

import {
  resolveDiseaseSemaphore,
  ScoreSanitarioEnfermedadesService
} from "./score-sanitario-enfermedades.service";

function buildService(options: {
  finalized?: boolean;
  observations?: Array<Record<string, unknown>>;
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
          : { visitaId: "visit-1", stepNumber: 3, finalizedAt: new Date() }
      )
  };
  const observations = {
    find: vi.fn().mockResolvedValue(options.observations ?? [])
  };

  return new ScoreSanitarioEnfermedadesService(
    visits as never,
    steps as never,
    observations as never
  );
}

function diseaseObservation(input: {
  code: string;
  percentage: number;
  severityGrade: number;
}) {
  return {
    plagaEnfermedadId: `disease-${input.code}`,
    incidencePercentage: String(input.percentage),
    plagaEnfermedad: { code: input.code, type: "enfermedad" },
    nivelIncidencia: { grade: 0 },
    nivelSeveridad: { grade: input.severityGrade }
  };
}

describe("ScoreSanitarioEnfermedadesService", () => {
  it("consolida las cuatro enfermedades y asigna nota 3 a las no evaluadas", async () => {
    const service = buildService({
      observations: [
        diseaseObservation({ code: "oidium", percentage: 12, severityGrade: 1 })
      ]
    });

    const result = await service.resolveVisitScore("visit-1");

    expect(result.score).toBe(1);
    expect(result.detail?.appliedFormula).toBe("MIN(1, 3, 3, 3) = 1");
    expect(result.detail?.diseaseScores).toHaveLength(4);
    expect(result.detail?.diseaseScores[0]).toMatchObject({
      key: "oidium",
      evaluated: true,
      incidencePercentage: 12,
      incidenceGrade: 2,
      severityGrade: 1,
      score: 1,
      formula: "3 - MAX(2, 1) = 1"
    });
    expect(result.detail?.diseaseScores.slice(1)).toEqual(
      expect.arrayContaining([expect.objectContaining({ evaluated: false, score: 3 })])
    );
  });

  it("devuelve score 3 cuando ninguna enfermedad fue evaluada y el paso finalizó", async () => {
    const result = await buildService({}).resolveVisitScore("visit-1");

    expect(result.score).toBe(3);
    expect(result.detail?.appliedFormula).toBe("MIN(3, 3, 3, 3) = 3");
    expect(result.detail?.semaphore).toBe("verde");
  });

  it("no calcula el módulo antes de finalizar el paso de enfermedades", async () => {
    const result = await buildService({ finalized: false }).resolveVisitScore("visit-1");

    expect(result).toEqual({
      finalized: false,
      score: null,
      percentage: null,
      detail: null
    });
  });

  it.each([
    [0, "rojo", "Crisis Sanitaria"],
    [1, "amarillo", "Alerta / Umbral de Acción"],
    [2, "verde", "Lote Sano / Control Eficiente"],
    [3, "verde", "Lote Sano / Control Eficiente"]
  ] as const)("mapea el score %i al semáforo %s", (score, semaphore, status) => {
    expect(resolveDiseaseSemaphore(score)).toMatchObject({ semaphore, status });
  });
});
