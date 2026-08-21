import { describe, expect, it } from "vitest";

import {
  calculateLocalTechnicalScores,
  type LocalTechnicalScoreInput
} from "./local-technical-scores";

function buildInput(
  overrides: Partial<LocalTechnicalScoreInput> = {}
): LocalTechnicalScoreInput {
  return {
    isActive: true,
    hasRecipe: false,
    finalizedSteps: [],
    departmentCode: null,
    sanitaryObservations: [],
    nutritionObservations: [],
    riego: null,
    labores: [],
    ...overrides
  };
}

describe("calculo local de scores tecnicos", () => {
  it("mantiene los modulos pendientes antes de finalizar o crear una receta", () => {
    const result = calculateLocalTechnicalScores(buildInput());

    expect(result).toEqual({
      detallePlagas: null,
      detalleEnfermedades: null,
      detalleNutricion: null,
      detalleRiego: null,
      detalleLabores: null
    });
  });

  it("asume grado cero y score 3 en los cuatro modulos cuando existe receta", () => {
    const result = calculateLocalTechnicalScores(buildInput({ hasRecipe: true }));

    expect(result.detallePlagas?.moduleScore).toBe(3);
    expect(result.detallePlagas?.pestScores).toHaveLength(6);
    expect(result.detalleEnfermedades?.moduleScore).toBe(3);
    expect(result.detalleEnfermedades?.diseaseScores).toHaveLength(4);
    expect(result.detalleNutricion?.moduleScore).toBe(3);
    expect(result.detalleNutricion?.nutritionScores).toHaveLength(8);
    expect(result.detalleRiego?.moduleScore).toBe(3);
  });

  it("usa el peor escenario de plagas y aplica la regla especial de Mosca", () => {
    const baseObservation = {
      pestDiseaseId: "mosca-1",
      code: "mosca_fruta",
      name: "Mosca de la fruta",
      type: "plaga",
      incidenceGrade: 2,
      severityGrade: 0,
      incidencePercentage: 0
    };
    const piura = calculateLocalTechnicalScores(
      buildInput({
        finalizedSteps: [2],
        departmentCode: "20",
        sanitaryObservations: [baseObservation]
      })
    );
    const elsewhere = calculateLocalTechnicalScores(
      buildInput({
        finalizedSteps: [2],
        departmentCode: "15",
        sanitaryObservations: [baseObservation]
      })
    );

    expect(piura.detallePlagas?.moduleScore).toBe(0);
    expect(piura.detallePlagas?.semaphore).toBe("rojo");
    expect(
      piura.detallePlagas?.pestScores.find((item) => item.key === "mosca_fruta")
        ?.specialRule
    ).toContain("Piura");
    expect(elsewhere.detallePlagas?.moduleScore).toBe(1);
  });

  it("deriva la incidencia de enfermedad desde el porcentaje entero", () => {
    const result = calculateLocalTechnicalScores(
      buildInput({
        finalizedSteps: [3],
        sanitaryObservations: [
          {
            pestDiseaseId: "oidium-1",
            code: "oidium",
            name: "Oidium",
            type: "enfermedad",
            incidenceGrade: 0,
            severityGrade: 1,
            incidencePercentage: 6
          }
        ]
      })
    );
    const oidium = result.detalleEnfermedades?.diseaseScores.find(
      (item) => item.key === "oidium"
    );

    expect(oidium).toMatchObject({ incidenceGrade: 2, severityGrade: 1, score: 1 });
    expect(result.detalleEnfermedades?.moduleScore).toBe(1);
    expect(result.detalleEnfermedades?.semaphore).toBe("amarillo");
  });

  it("deriva la nota nutricional desde el porcentaje y toma el minimo", () => {
    const result = calculateLocalTechnicalScores(
      buildInput({
        finalizedSteps: [4],
        nutritionObservations: [
          {
            nutrientId: "hierro-1",
            code: "hierro",
            name: "Hierro",
            description: "Nutricion - Hierro: Incidencia 21%",
            incidencePercentage: 21
          }
        ]
      })
    );

    expect(
      result.detalleNutricion?.nutritionScores.find((item) => item.key === "hierro")
    ).toMatchObject({ incidenceGrade: 3, score: 0 });
    expect(result.detalleNutricion?.moduleScore).toBe(0);
    expect(result.detalleNutricion?.semaphore).toBe("rojo");
  });

  it.each([
    ["calcio", "Calcio"],
    ["fosforo", "Fósforo"]
  ])("incluye la nueva deficiencia %s en el score local", (code, name) => {
    const result = calculateLocalTechnicalScores(
      buildInput({
        finalizedSteps: [4],
        nutritionObservations: [
          {
            nutrientId: `${code}-1`,
            code,
            name,
            description: `Nutricion - ${name}: Incidencia 6%`,
            incidencePercentage: 6
          }
        ]
      })
    );

    expect(
      result.detalleNutricion?.nutritionScores.find((item) => item.key === code)
    ).toMatchObject({ name, evaluated: true, incidenceGrade: 2, score: 1 });
    expect(result.detalleNutricion?.nutritionScores).toHaveLength(8);
  });

  it.each([
    [true, "seco", 3],
    [true, "moderadamente_seco", 2],
    [true, "optimo", 1],
    [true, "saturado", 0],
    [false, "optimo", 3],
    [false, "moderadamente_seco", 2],
    [false, "saturado", 1],
    [false, "seco", 0]
  ] as const)(
    "calcula riego con estres=%s y humedad=%s",
    (estresHidrico, humedadSuelo, expectedScore) => {
      const result = calculateLocalTechnicalScores(
        buildInput({ riego: { estresHidrico, humedadSuelo } })
      );

      expect(result.detalleRiego?.moduleScore).toBe(expectedScore);
    }
  );

  it("mantiene riego pendiente si faltan sus dos datos obligatorios", () => {
    expect(
      calculateLocalTechnicalScores(
        buildInput({ riego: { humedadSuelo: "optimo", estresHidrico: null } })
      ).detalleRiego
    ).toBeNull();
  });
});
