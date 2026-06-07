import type { VisitaEvaluacion } from "../../evaluaciones/types";
import type {
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../observaciones-sanitarias/types";
import type { VisitaProductoRecomendado } from "../../productos-recomendados/types";
import type { VisitaRecomendacion } from "../../recomendaciones/types";
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
};

export type RecentVisitaCampo = {
  id: string;
  parcelaId: string;
  parcelaName: string | null;
  visitDate: string;
  startVisitTime: string;
  syncStatus: VisitaCampo["syncStatus"];
  createdAt: string;
};

export type VisitaCampoFull = {
  visita: VisitaCampo;
  evaluaciones: VisitaEvaluacion[];
  observacionesSanitarias: VisitaObservacionSanitaria[];
  stepNotes: VisitaStepNote[];
  recomendaciones: VisitaRecomendacion[];
  productosRecomendados: VisitaProductoRecomendado[];
};

export type VisitaSyncSummary = {
  overallStatus: "pending" | "synced" | "error" | "partial";
  totalEntities: number;
  syncedCount: number;
  pendingCount: number;
  errorCount: number;
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
