import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { VisitaEvaluacionEntity } from "../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { resolveNutritionIncidenceGrade } from "../domain/nutrition-incidence";
import { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";
import { VisitaPasoObservacionEntity } from "../infrastructure/persistence/entities/visita-paso-observacion.entity";

export type NutritionSemaphore = "verde" | "amarillo" | "rojo";

export type NutritionScoreDetailItem = {
  key: string;
  nutrientId: string | null;
  name: string;
  evaluated: boolean;
  incidencePercentage: number;
  incidenceGrade: number;
  score: number;
  formula: string;
};

export type NutritionModuleScoreDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: NutritionSemaphore;
  status: string;
  message: string;
  nutritionScores: NutritionScoreDetailItem[];
};

type NutritionModuleScore = {
  finalized: boolean;
  score: number | null;
  percentage: number | null;
  detail: NutritionModuleScoreDetail | null;
};

const NUTRITION_DEFINITIONS = [
  { key: "nitrogeno", name: "Nitrógeno" },
  { key: "magnesio", name: "Magnesio" },
  { key: "potasio", name: "Potasio" },
  { key: "hierro", name: "Hierro" },
  { key: "zinc", name: "Zinc" },
  { key: "boro", name: "Boro" }
] as const;

const NUTRITION_MODULE_FORMULA =
  "ScoreNutricion = MIN(nota de Nitrógeno, nota de Magnesio, nota de Potasio, nota de Hierro, nota de Zinc, nota de Boro)";

@Injectable()
export class ScoreTecnicoNutricionService {
  constructor(
    @InjectRepository(VisitaCampoEntity)
    private readonly visits: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaPasoObservacionEntity)
    private readonly steps: Repository<VisitaPasoObservacionEntity>,
    @InjectRepository(VisitaEvaluacionEntity)
    private readonly evaluations: Repository<VisitaEvaluacionEntity>
  ) {}

  async resolveVisitScore(
    visitaId: string,
    completedByRecipe = false
  ): Promise<NutritionModuleScore> {
    const visit = await this.visits.findOne({ where: { id: visitaId } });
    if (!visit) throw new NotFoundException("Visita de campo no encontrada.");
    if (!visit.isActive) return emptyNutritionModuleScore();

    const step = await this.steps.findOne({ where: { visitaId, stepNumber: 4 } });
    if (!step?.finalizedAt && !completedByRecipe) return emptyNutritionModuleScore();

    const rows = await this.evaluations.find({
      where: { visitaId },
      relations: { nutrient: true }
    });
    const nutritionRows = rows.filter(
      (row) => row.nutrientId !== null || row.description.startsWith("Nutricion -")
    );
    const nutritionScores = NUTRITION_DEFINITIONS.map((definition) => {
      const row = nutritionRows.find(
        (candidate) => resolveNutritionKey(candidate) === definition.key
      );
      const incidencePercentage = Number(row?.incidencePercentage ?? 0);
      const incidenceGrade = resolveNutritionIncidenceGrade(incidencePercentage);
      const score = 3 - incidenceGrade;

      return {
        key: definition.key,
        nutrientId: row?.nutrientId ?? null,
        name: definition.name,
        evaluated: Boolean(row),
        incidencePercentage,
        incidenceGrade,
        score,
        formula: `NotaNutricion = 3 - ${incidenceGrade} = ${score}`
      } satisfies NutritionScoreDetailItem;
    });
    const score = Math.min(...nutritionScores.map((item) => item.score));
    const percentage = roundHalfUp((score / 3) * 100);
    const semaphore = resolveNutritionSemaphore(score);

    return {
      finalized: true,
      score,
      percentage,
      detail: {
        moduleFormula: NUTRITION_MODULE_FORMULA,
        appliedFormula: `ScoreNutricion = MIN(${nutritionScores.map((item) => item.score).join(", ")}) = ${score}`,
        moduleScore: score,
        modulePercentage: percentage,
        semaphore: semaphore.semaphore,
        status: semaphore.status,
        message: semaphore.message,
        nutritionScores
      }
    };
  }
}

function resolveNutritionKey(row: VisitaEvaluacionEntity) {
  if (row.nutrient?.code) return normalizeCatalogName(row.nutrient.code);
  const name = row.description.slice("Nutricion -".length).split(":", 1)[0];
  return normalizeCatalogName(name);
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function emptyNutritionModuleScore(): NutritionModuleScore {
  return { finalized: false, score: null, percentage: null, detail: null };
}

export function resolveNutritionSemaphore(score: number) {
  if (score === 0) {
    return {
      semaphore: "rojo" as const,
      status: "Deficiencia Crítica / Riesgo de Rendimiento",
      message:
        "¡Alerta Crítica de Nutrición! Más del 20% del lote presenta síntomas severos. Pérdida de rendimiento asegurada. Suspender plan base y realizar análisis urgente de suelo y agua para reestructurar el programa."
    };
  }
  if (score === 1) {
    return {
      semaphore: "amarillo" as const,
      status: "Alerta de Bloqueo Nutricional",
      message:
        "Deficiencias moderadas detectadas. Programar aplicación correctiva de choque con quelatos. Si se sospecha de Hierro, revisar si un pH muy alto en el suelo está bloqueando el elemento."
    };
  }
  return {
    semaphore: "verde" as const,
    status: "Fundo Nutrito / Salud Fuerte",
    message:
      "Estado nutricional óptimo o bajo control preventivo. Continuar con el calendario de fertirriego regular."
  };
}

function roundHalfUp(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
