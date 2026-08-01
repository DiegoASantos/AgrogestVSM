import type { VisitaEvaluacion } from "../../evaluaciones/types";
import type { VisitaLaborCultural } from "../../labores-culturales-visita/types";
import type {
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../observaciones-sanitarias/types";
import type { VisitaRiego } from "../../riegos/types";
import type { GeoJsonPointGeometry } from "../../../shared/maps/geo";

export type VisitaCampo = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  publicId: string;
  nroFicha: string | null;
  cropId: string;
  varietyId: string;
  parcelaId: string;
  campaignId: string;
  agronomistUserId: string;
  plantsCount: number | null;
  areaHectares: string | null;
  sowingDate: string | null;
  visitDate: string;
  startVisitTime: string;
  endVisitTime: string | null;
  phenologicalStageId: string | null;
  subEtapaId: string | null;
  subEtapaPercentage: number | null;
  generalObservation: string | null;
  agronomistSignatureName: string | null;
  producerSignatureName: string | null;
  visitLocation: GeoJsonPointGeometry | null;
  synchronizedAt: string | null;
  syncErrorMessage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  recetaAnteriorJson: string | null;
};

export type RecentVisitaCampo = {
  id: string;
  parcelaId: string;
  parcelaName: string | null;
  productorId: string | null;
  productorName: string | null;
  visitDate: string;
  startVisitTime: string;
  syncStatus: VisitaCampo["syncStatus"];
  createdAt: string;
};

export type VisitaCampoFull = {
  visita: VisitaCampo;
  evaluaciones: VisitaEvaluacion[];
  observacionesSanitarias: VisitaObservacionSanitaria[];
  riego: VisitaRiego | null;
  laboresCulturales: VisitaLaborCultural[];
  stepNotes: VisitaStepNote[];
};

export type VisitaSyncSummary = {
  overallStatus: "pending" | "synced" | "error" | "partial";
  totalEntities: number;
  syncedCount: number;
  pendingCount: number;
  errorCount: number;
};

export type TechnicalModuleScore = {
  score: number | null;
  percentage: number | null;
  semaphore: "verde" | "amarillo" | "rojo" | null;
};

export type PestModuleTechnicalDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  pestScores: Array<{
    key: string;
    pestDiseaseId: string | null;
    name: string;
    evaluated: boolean;
    incidenceGrade: number;
    severityGrade: number;
    score: number;
    formula: string;
    specialRule: string | null;
  }>;
};

export type DiseaseModuleTechnicalDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  diseaseScores: Array<{
    key: string;
    pestDiseaseId: string | null;
    name: string;
    evaluated: boolean;
    incidencePercentage: number;
    incidenceGrade: number;
    severityGrade: number;
    score: number;
    formula: string;
  }>;
};

export type NutritionModuleTechnicalDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  nutritionScores: Array<{
    key: string;
    nutrientId: string | null;
    name: string;
    evaluated: boolean;
    incidencePercentage: number;
    incidenceGrade: number;
    score: number;
    formula: string;
  }>;
};

export type RiegoModuleTechnicalDetail = {
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
};

export type TechnicalVisitScores = {
  visitaId: string;
  scoreTecnicoGeneral: number | null;
  modulosIncluidos: Array<"plagas" | "enfermedades" | "nutricion" | "riego" | "labores">;
  modulosFaltantes: Array<"plagas" | "enfermedades" | "nutricion" | "riego" | "labores">;
  scorePorModulo: Record<
    "plagas" | "enfermedades" | "nutricion" | "riego" | "labores",
    TechnicalModuleScore
  >;
  detallePlagas: PestModuleTechnicalDetail | null;
  detalleEnfermedades: DiseaseModuleTechnicalDetail | null;
  detalleNutricion: NutritionModuleTechnicalDetail | null;
  detalleRiego: RiegoModuleTechnicalDetail | null;
};

export type CreateVisitaCampoDraft = {
  publicId?: string;
  cropId: string;
  varietyId: string;
  parcelaId: string;
  campaignId: string;
  visitLocation?: GeoJsonPointGeometry;
  plantsCount?: number;
  areaHectares?: string;
  sowingDate?: string;
  visitDate: string;
  startVisitTime: string;
  endVisitTime?: string;
  phenologicalStageId?: string;
  subEtapaId?: string;
  subEtapaPercentage?: number;
  generalObservation?: string;
};
