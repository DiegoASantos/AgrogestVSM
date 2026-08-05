import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { VisitaRecetaEntity } from "../../visita-recetas/infrastructure/persistence/entities/visita-receta.entity";
import {
  resolveStageWeights,
  type CalificacionModulo
} from "../../visita-calificaciones/domain/weight-matrix";
import { ScoreSanitarioPlagasService } from "./score-sanitario-plagas.service";
import { ScoreSanitarioEnfermedadesService } from "./score-sanitario-enfermedades.service";
import { ScoreTecnicoNutricionService } from "./score-tecnico-nutricion.service";
import { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";

export type TechnicalModule = CalificacionModulo;
type TechnicalModuleScore = {
  score: number | null;
  percentage: number | null;
  semaphore: "verde" | "amarillo" | "rojo" | null;
};
type RiegoModuleScoreDetail = {
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
};
type LaborModuleScoreDetail = {
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  laborScores: Array<{
    categoryCode: string;
    categoryName: string;
    optionCode: string;
    optionName: string;
    score: number;
    weight: number;
  }>;
};
type TechnicalScores = Record<TechnicalModule, TechnicalModuleScore>;

const TECHNICAL_MODULES: TechnicalModule[] = [
  "plagas",
  "enfermedades",
  "nutricion",
  "riego",
  "labores"
];
const LABOR_WEIGHTS: Record<string, number> = {
  weed_infestation: 10,
  soil_sanitary_status: 20,
  unproductive_branch_density: 10,
  branch_break_risk: 25,
  canopy_status: 15,
  load_balance: 20
};
const LABOR_POINTS: Record<string, Record<string, number>> = {
  weed_infestation: { clean: 3, low: 2, high: 1 },
  soil_sanitary_status: { clean: 3, mild: 2, critical: 0 },
  unproductive_branch_density: { low: 3, moderate: 2, high: 1 },
  branch_break_risk: { low: 3, critical: 0 },
  canopy_status: { good: 3, shaded: 1 },
  load_balance: { balanced: 3, low_volume: 1, excessive: 1 }
};

@Injectable()
export class TechnicalScoresService {
  constructor(
    @InjectRepository(VisitaCampoEntity)
    private readonly visits: Repository<VisitaCampoEntity>,
    private readonly pestScores: ScoreSanitarioPlagasService,
    private readonly diseaseScores: ScoreSanitarioEnfermedadesService,
    private readonly nutritionScores: ScoreTecnicoNutricionService,
    @InjectRepository(VisitaRecetaEntity)
    private readonly recipes: Repository<VisitaRecetaEntity>
  ) {}

  async byVisit(visitaId: string) {
    const result = await this.calculateVisit(visitaId);
    return createSuccessResponse(result);
  }

  async byProductor(productorId: string, campaniaId?: string) {
    const query = this.visits
      .createQueryBuilder("visita")
      .innerJoin(ParcelaEntity, "parcela", "parcela.id = visita.parcela_id")
      .where("parcela.productor_id = :productorId", { productorId })
      .andWhere("visita.activo = true");
    if (campaniaId) query.andWhere("visita.campania_id = :campaniaId", { campaniaId });
    const visits = await query.getMany();
    const results = await Promise.all(
      visits.map((visit) => this.calculateVisit(visit.id))
    );
    return createSuccessResponse({
      productorId,
      campaniaId: campaniaId ?? null,
      visitasConsideradas: results.length,
      scoreTecnicoGeneral: average(results.map((item) => item.scoreTecnicoGeneral)),
      scorePorModulo: Object.fromEntries(
        TECHNICAL_MODULES.map((module) => [
          module,
          average(results.map((item) => item.scorePorModulo[module].percentage))
        ])
      )
    });
  }

  private async calculateVisit(visitaId: string) {
    const visit = await this.visits.findOne({
      where: { id: visitaId },
      relations: {
        etapaFenologica: true,
        observacionesSanitarias: {
          plagaEnfermedad: true,
          nivelIncidencia: true,
          nivelSeveridad: true
        },
        riego: true,
        labores: { laborCultural: true }
      }
    });
    if (!visit) throw new NotFoundException("Visita de campo no encontrada.");

    const completedByRecipe = Boolean(
      await this.recipes.findOne({
        where: { visitaId },
        select: { id: true }
      })
    );
    const pest = await this.pestScores.resolveVisitScore(visitaId, completedByRecipe);
    const disease = await this.diseaseScores.resolveVisitScore(
      visitaId,
      completedByRecipe
    );
    const nutrition = await this.nutritionScores.resolveVisitScore(
      visitaId,
      completedByRecipe
    );
    const riegoScore = irrigationScore(visit, completedByRecipe);
    const riegoDetail: RiegoModuleScoreDetail | null =
      riegoScore.score !== null
        ? {
            moduleScore: riegoScore.score,
            modulePercentage: riegoScore.percentage!,
            semaphore: riegoScore.semaphore as "verde" | "amarillo" | "rojo",
            ...resolveRiegoSemaphore(riegoScore.score)
          }
        : null;
    const laborResult = laborScore(visit);
    const scores: TechnicalScores = {
      plagas: moduleScore(pest.score, "plagas"),
      enfermedades: moduleScore(disease.score, "enfermedades"),
      nutricion: moduleScore(nutrition.score, "nutricion"),
      riego: riegoScore,
      labores: laborResult
    };
    const laborDetail: LaborModuleScoreDetail | null = laborResult.score !== null
      ? resolveLaborDetail(visit, laborResult.score, laborResult.percentage!, laborResult.semaphore as "verde" | "amarillo" | "rojo")
      : null;
    const weights = resolveStageWeights(visit.etapaFenologica?.name);
    const available = TECHNICAL_MODULES.filter((module) => scores[module].score !== null);
    const scoreTecnicoGeneral =
      !weights || available.length === 0
        ? null
        : round(
            (available.reduce(
              (total, module) => total + (scores[module].score! / 3) * weights[module],
              0
            ) /
              available.reduce((total, module) => total + weights[module], 0)) *
              100
          );
    return {
      visitaId: visit.id,
      scoreTecnicoGeneral,
      modulosIncluidos: available,
      modulosFaltantes: TECHNICAL_MODULES.filter((module) => !available.includes(module)),
      scorePorModulo: scores,
      detallePlagas: pest.detail ?? null,
      detalleEnfermedades: disease.detail ?? null,
      detalleNutricion: nutrition.detail ?? null,
      detalleRiego: riegoDetail,
      detalleLabores: laborDetail
    };
  }
}

function irrigationScore(
  visit: VisitaCampoEntity,
  completedByRecipe: boolean
): TechnicalModuleScore {
  const riego = visit.riego[0];
  if (!riego) return moduleScore(completedByRecipe ? 3 : null, "riego");
  if (riego.estresHidrico === null || !riego.humedadSuelo)
    return moduleScore(null, "riego");
  const scores = riego.estresHidrico
    ? { seco: 3, moderadamente_seco: 2, optimo: 1, saturado: 0 }
    : { optimo: 3, moderadamente_seco: 2, saturado: 1, seco: 0 };
  return moduleScore(scores[riego.humedadSuelo as keyof typeof scores] ?? null, "riego");
}

function laborScore(visit: VisitaCampoEntity): TechnicalModuleScore {
  const selected = new Map(
    visit.labores.map((item) => [
      item.laborCultural?.categoryCode,
      item.laborCultural?.optionCode
    ])
  );
  if (Object.keys(LABOR_WEIGHTS).some((category) => !selected.has(category)))
    return moduleScore(null, "labores");
  const score =
    Object.entries(LABOR_WEIGHTS).reduce((total, [category, weight]) => {
      const option = selected.get(category) ?? "";
      return total + (LABOR_POINTS[category][option] ?? 0) * weight;
    }, 0) / 100;
  return moduleScore(round(score), "labores");
}

function resolveLaborDetail(
  visit: VisitaCampoEntity,
  moduleScore: number,
  modulePercentage: number,
  semaphore: "verde" | "amarillo" | "rojo"
): LaborModuleScoreDetail {
  const selected = new Map(
    visit.labores.map((item) => [item.laborCultural?.categoryCode, item.laborCultural])
  );
  const laborScores = Object.entries(LABOR_WEIGHTS).map(([category, weight]) => {
    const labor = selected.get(category);
    const optionCode = labor?.optionCode ?? "";
    const score = LABOR_POINTS[category]?.[optionCode] ?? 0;
    return {
      categoryCode: category,
      categoryName: labor?.categoryName ?? "",
      optionCode,
      optionName: labor?.optionLabel ?? "",
      score,
      weight
    };
  });
  const { status, message } = resolveLaborSemaphore(moduleScore);
  return { moduleScore, modulePercentage, semaphore, status, message, laborScores };
}

function resolveLaborSemaphore(score: number) {
  if (score <= 1) {
    return {
      status: "Lote en estado critico de manejo cultural",
      message:
        "El lote requiere intervencion inmediata. Hay riesgos estructurales o fitosanitarios que ponen en peligro la cosecha."
    };
  }
  if (score === 2) {
    return {
      status: "Lote en estado intermedio de manejo",
      message:
        "El lote esta bajo control, pero acumula labores retrasadas que afectaran el potencial optimo si no se programan esta semana."
    };
  }
  return {
    status: "Lote en excelente condicion agronomica",
    message:
      "El lote se encuentra en optimas condiciones de manejo cultural. Continuar con el plan de trabajo estandar."
  };
}

function moduleScore(
  score: number | null,
  module: TechnicalModule
): TechnicalModuleScore {
  if (score === null) return { score: null, percentage: null, semaphore: null };
  const semaphore =
    module === "plagas" || module === "enfermedades" || module === "nutricion"
      ? score === 0
        ? "rojo"
        : score === 1
          ? "amarillo"
          : "verde"
      : score <= 1
        ? "rojo"
        : score === 2 && module === "riego"
          ? "amarillo"
          : "verde";
  return { score, percentage: round((score / 3) * 100), semaphore };
}
function resolveRiegoSemaphore(score: number) {
  if (score === 0 || score === 1) {
    return {
      status:
        "Alerta critica en el sistema de riego, desviacion grave detectada en la humedad del suelo.",
      message:
        "El estado actual arruina el llenado del fruto, las raices o sabotea la induccion floral del cultivo de exportacion. Corregir los turnos o valvulas de inmediato."
    };
  }
  if (score === 2) {
    return {
      status: "Suelo Entrando en desecacion moderada",
      message:
        "El sistema requiere la programacion fisica de un turno regular en las proximas horas para evitar el estres del cultivo."
    };
  }
  return {
    status: "Manejo de Riego Excelente",
    message:
      "Estrategia hidrica en estado optimo. Se cumplen los objetivos agronomicos de la etapa fenologica actual."
  };
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length
    ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
    : null;
}
function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
