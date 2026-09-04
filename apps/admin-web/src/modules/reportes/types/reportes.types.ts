import type { ParcelaListItem } from "../../parcelas/types/parcelas.types";
import type { ProductorListItem } from "../../productores/types/productores.types";
import type { AgronomistLookupItem } from "../../seguridad/types/security.types";
import type {
  GeoJsonMultiPolygonGeometry,
  GeoJsonPointGeometry
} from "../../../shared/types/geo-json.types";

export type VisitReportFilters = {
  agronomistUserId: string;
  productorId: string;
  startDate: string;
  endDate: string;
};

export type VisitReportSummaryRow = {
  agronomistUserId: string;
  engineerName: string;
  visitsCount: number;
  visitDays: number;
  dailyAverage: number;
};

export type VisitReportTimelinePoint = {
  visitDate: string;
  hectares: number;
  visitsCount: number;
};

export type VisitsReportData = {
  summary: VisitReportSummaryRow[];
  timeline: VisitReportTimelinePoint[];
};

export type VisitsReportCatalogs = {
  agronomists: AgronomistLookupItem[];
  productores: ProductorListItem[];
  parcelas: ParcelaListItem[];
};

export type FieldsByStageFilters = {
  agronomistUserId: string;
  productorId: string;
};

export type FieldsByStageCatalogs = {
  agronomists: AgronomistLookupItem[];
  productores: ProductorListItem[];
};

export type FieldsByStageCatalogItem = {
  id: string;
  name: string;
  type: "Etapa" | "Labor";
  sortOrder: number | null;
};

export type FieldsByStageDistribution = {
  stageId: string;
  count: number;
  percentage: number;
};

export type FieldsByStageEngineerDistribution = {
  stageId: string;
  count: number;
  percentageOfFilteredTotal: number;
  percentageOfEngineer: number;
};

export type FieldsByStageEngineerRow = {
  agronomistUserId: string;
  engineerName: string;
  totalParcels: number;
  stages: FieldsByStageEngineerDistribution[];
};

export type FieldsByStageParcel = {
  parcelId: string;
  parcelCode: string;
  parcelName: string | null;
  productorId: string;
  productorName: string;
  agronomistUserId: string;
  engineerName: string;
  stageId: string;
  stageName: string;
  geometry: GeoJsonMultiPolygonGeometry | null;
  parcelPoint: GeoJsonPointGeometry | null;
  referencePoint: GeoJsonPointGeometry | null;
};

export type FieldsByStageReportData = {
  stages: FieldsByStageCatalogItem[];
  summary: {
    totalCategorizedParcels: number;
    uncategorizedParcels: number;
    byStage: FieldsByStageDistribution[];
    byEngineer: FieldsByStageEngineerRow[];
  };
  parcels: FieldsByStageParcel[];
};
