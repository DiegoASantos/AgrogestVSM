import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
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
    private readonly nutritionScores: ScoreTecnicoNutricionService
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

    const pest = await this.pestScores.resolveVisitScore(visitaId);
    const disease = await this.diseaseScores.resolveVisitScore(visitaId);
    const nutrition = await this.nutritionScores.resolveVisitScore(visitaId);
    const riegoScore = irrigationScore(visit);
    const riegoDetail: RiegoModuleScoreDetail | null =
      riegoScore.score !== null
        ? {
            moduleScore: riegoScore.score,
            modulePercentage: riegoScore.percentage!,
            semaphore: riegoScore.semaphore as "verde" | "amarillo" | "rojo",
            ...resolveRiegoSemaphore(riegoScore.score)
          }
        : null;
    const scores: TechnicalScores = {
      plagas: moduleScore(pest.score, "plagas"),
      enfermedades: moduleScore(disease.score, "enfermedades"),
      nutricion: moduleScore(nutrition.score, "nutricion"),
      riego: riegoScore,
      labores: laborScore(visit)
    };
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
      detalleRiego: riegoDetail
    };
  }
}

function irrigationScore(visit: VisitaCampoEntity): TechnicalModuleScore {
  const riego = visit.riego[0];
  if (!riego || riego.estresHidrico === null || !riego.humedadSuelo)
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
