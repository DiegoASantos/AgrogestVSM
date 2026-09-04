import type { ParcelaListItem } from "../../parcelas/types/parcelas.types";
import type { ProductorListItem } from "../../productores/types/productores.types";
import type { AgronomistLookupItem } from "../../seguridad/types/security.types";

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
