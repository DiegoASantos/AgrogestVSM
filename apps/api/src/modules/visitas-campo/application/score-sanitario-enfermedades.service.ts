import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { resolveDiseaseIncidenceGrade } from "../../visita-observaciones-sanitarias/domain/disease-incidence";
import { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";
import { VisitaPasoObservacionEntity } from "../infrastructure/persistence/entities/visita-paso-observacion.entity";

export type DiseaseSemaphore = "verde" | "amarillo" | "rojo";

export type DiseaseScoreDetailItem = {
  key: string;
  pestDiseaseId: string | null;
  name: string;
  evaluated: boolean;
  incidencePercentage: number;
  incidenceGrade: number;
  severityGrade: number;
  score: number;
  formula: string;
};

export type DiseaseModuleScoreDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: DiseaseSemaphore;
  status: string;
  message: string;
  diseaseScores: DiseaseScoreDetailItem[];
};

type DiseaseModuleScore = {
  finalized: boolean;
  score: number | null;
  percentage: number | null;
  detail: DiseaseModuleScoreDetail | null;
};

const DISEASE_DEFINITIONS = [
  { key: "oidium", name: "Oidium" },
  { key: "antracnosis", name: "Antracnosis" },
  { key: "muerte_regresiva", name: "Muerte regresiva" },
  { key: "alternaria", name: "Alternaria" }
] as const;

const DISEASE_MODULE_FORMULA =
  "MIN(nota de Oidium, nota de Antracnosis, nota de Muerte regresiva, nota de Alternaria)";

@Injectable()
export class ScoreSanitarioEnfermedadesService {
  constructor(
    @InjectRepository(VisitaCampoEntity)
    private readonly visits: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaPasoObservacionEntity)
    private readonly steps: Repository<VisitaPasoObservacionEntity>,
    @InjectRepository(VisitaObservacionSanitariaEntity)
    private readonly observations: Repository<VisitaObservacionSanitariaEntity>
  ) {}

  async resolveVisitScore(visitaId: string): Promise<DiseaseModuleScore> {
    const visit = await this.visits.findOne({ where: { id: visitaId } });
    if (!visit) throw new NotFoundException("Visita de campo no encontrada.");
    if (!visit.isActive) return emptyDiseaseModuleScore();

    const step = await this.steps.findOne({ where: { visitaId, stepNumber: 3 } });
    if (!step?.finalizedAt) return emptyDiseaseModuleScore();

    const rows = await this.observations.find({
      where: { visitaId },
      relations: {
        plagaEnfermedad: true,
        nivelIncidencia: true,
        nivelSeveridad: true
      }
    });
    const diseaseRows = rows.filter(
      (row) => row.plagaEnfermedad.type.toLowerCase() === "enfermedad"
    );
    const diseaseScores = DISEASE_DEFINITIONS.map((definition) => {
      const row = diseaseRows.find(
        (candidate) => candidate.plagaEnfermedad.code === definition.key
      );
      const incidencePercentage = Number(row?.incidencePercentage ?? 0);
      const incidenceGrade = resolveDiseaseIncidenceGrade(incidencePercentage);
      const severityGrade = row?.nivelSeveridad?.grade ?? 0;
      const score = 3 - Math.max(incidenceGrade, severityGrade);

      return {
        key: definition.key,
        pestDiseaseId: row?.plagaEnfermedadId ?? null,
        name: definition.name,
        evaluated: Boolean(row),
        incidencePercentage,
        incidenceGrade,
        severityGrade,
        score,
        formula: `3 - MAX(${incidenceGrade}, ${severityGrade}) = ${score}`
      } satisfies DiseaseScoreDetailItem;
    });
    const score = Math.min(...diseaseScores.map((item) => item.score));
    const percentage = roundHalfUp((score / 3) * 100);
    const semaphore = resolveDiseaseSemaphore(score);

    return {
      finalized: true,
      score,
      percentage,
      detail: {
        moduleFormula: DISEASE_MODULE_FORMULA,
        appliedFormula: `MIN(${diseaseScores.map((item) => item.score).join(", ")}) = ${score}`,
        moduleScore: score,
        modulePercentage: percentage,
        semaphore: semaphore.semaphore,
        status: semaphore.status,
        message: semaphore.message,
        diseaseScores
      }
    };
  }
}

function emptyDiseaseModuleScore(): DiseaseModuleScore {
  return { finalized: false, score: null, percentage: null, detail: null };
}

export function resolveDiseaseSemaphore(score: number) {
  if (score === 0) {
    return {
      semaphore: "rojo" as const,
      status: "Crisis Sanitaria",
      message:
        "¡Crisis Fitosanitaria! Infección severa o dispersión masiva detectada. Alto riesgo de pérdida total de flores o rechazo absoluto del lote para exportación. Aplicar control químico de choque."
    };
  }
  if (score === 1) {
    return {
      semaphore: "amarillo" as const,
      status: "Alerta / Umbral de Acción",
      message:
        "Umbral de daño alcanzado. Se requiere la aplicación inmediata de fungicidas específicos o la ejecución de podas sanitarias de urgencia (para frenar puntas secas)."
    };
  }
  return {
    semaphore: "verde" as const,
    status: "Lote Sano / Control Eficiente",
    message:
      "Sanidad vegetal óptima. Continuar con el programa de aplicaciones preventivas antes de floración y tras el cuajado."
  };
}

function roundHalfUp(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
