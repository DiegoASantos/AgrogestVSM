import { describe, expect, it } from "vitest";

import type { VisitaEvaluacion } from "../types";
import {
  getLegacyEvaluationDeleteServerIds,
  hasBlockedNutritionEvaluationDelete,
  hasRemoteNutritionEvaluationForDelete,
  hasUnsyncedNutritionEvaluation
} from "./nutrition-sync";

function evaluation(overrides: Partial<VisitaEvaluacion> = {}): VisitaEvaluacion {
  return {
    id: "evaluation-1",
    serverId: null,
    syncStatus: "synced",
    visitaId: "visit-1",
    nutrientId: "nutrient-1",
    order: 3001,
    incidencePercentage: "5",
    percentage: null,
    description: "Nutricion - Nitrogeno: Incidencia 5%",
    organosAfectados: [],
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:00.000Z",
    ...overrides
  };
}

describe("hasUnsyncedNutritionEvaluation", () => {
  it.each(["pending", "error"] as const)(
    "detecta una evaluación nutricional %s",
    (syncStatus) => {
      expect(hasUnsyncedNutritionEvaluation([evaluation({ syncStatus })])).toBe(true);
    }
  );

  it("permite finalizar sin registros o con registros sincronizados", () => {
    expect(hasUnsyncedNutritionEvaluation([])).toBe(false);
    expect(hasUnsyncedNutritionEvaluation([evaluation()])).toBe(false);
  });

  it("reconoce registros históricos por el prefijo de descripción", () => {
    expect(
      hasUnsyncedNutritionEvaluation([
        evaluation({ nutrientId: null, syncStatus: "pending" })
      ])
    ).toBe(true);
  });

  it("bloquea la finalización ante un borrado nutricional pendiente o fallido", () => {
    expect(
      hasBlockedNutritionEvaluationDelete("visit-1", [
        {
          entityType: "visita_evaluaciones",
          operation: "delete",
          payload: JSON.stringify({
            serverId: "server-evaluation-1",
            visitaId: "visit-1",
            nutrientId: "nutrient-1"
          })
        }
      ])
    ).toBe(true);
  });

  it("ignora borrados de otras visitas o evaluaciones no nutricionales", () => {
    expect(
      hasBlockedNutritionEvaluationDelete("visit-1", [
        {
          entityType: "visita_evaluaciones",
          operation: "delete",
          payload: JSON.stringify({
            visitaId: "visit-2",
            nutrientId: "nutrient-1"
          })
        },
        {
          entityType: "visita_evaluaciones",
          operation: "delete",
          payload: JSON.stringify({
            visitaId: "visit-1",
            nutrientId: null,
            description: "Evaluacion vegetativa"
          })
        }
      ])
    ).toBe(false);
  });

  it("solo bloquea temporalmente un borrado legado sin visita mientras sigue en outbox", () => {
    const legacyDelete = {
      entityType: "visita_evaluaciones",
      operation: "delete",
      payload: JSON.stringify({ serverId: "server-evaluation-legacy" })
    };

    expect(hasBlockedNutritionEvaluationDelete("visit-1", [legacyDelete], true)).toBe(
      true
    );
    expect(hasBlockedNutritionEvaluationDelete("visit-1", [legacyDelete])).toBe(false);
    expect(getLegacyEvaluationDeleteServerIds([legacyDelete])).toEqual([
      "server-evaluation-legacy"
    ]);
  });

  it("acota un fallo legado a la visita que aún contiene esa evaluación nutricional", () => {
    expect(
      hasRemoteNutritionEvaluationForDelete(
        ["server-evaluation-1"],
        [
          {
            id: "server-evaluation-1",
            nutrientId: null,
            description: "Nutricion - Zinc: Incidencia 5%"
          }
        ]
      )
    ).toBe(true);
    expect(
      hasRemoteNutritionEvaluationForDelete(
        ["server-evaluation-1"],
        [
          {
            id: "server-evaluation-other",
            nutrientId: "nutrient-1",
            description: "Nutricion - Zinc: Incidencia 5%"
          }
        ]
      )
    ).toBe(false);
  });
});
