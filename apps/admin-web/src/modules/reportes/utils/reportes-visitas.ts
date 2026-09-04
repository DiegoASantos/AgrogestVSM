import type { ParcelaListItem } from "../../parcelas/types/parcelas.types";
import type { VisitReportFilters } from "../types/reportes.types";

export function currentMonthReportFilters(now = new Date()): VisitReportFilters {
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    agronomistUserId: "",
    productorId: "",
    startDate: toDateInputValue(startDate),
    endDate: toDateInputValue(now)
  };
}

export function filterAssignedReportParcelas(
  parcelas: ParcelaListItem[],
  filters: Pick<VisitReportFilters, "agronomistUserId" | "productorId">
) {
  return parcelas.filter(
    (parcela) =>
      parcela.isActive &&
      Boolean(parcela.agronomoUsuarioId) &&
      (!filters.agronomistUserId ||
        parcela.agronomoUsuarioId === filters.agronomistUserId) &&
      (!filters.productorId || parcela.productorId === filters.productorId)
  );
}

export function resolveReportParcelaGeodata(parcela: ParcelaListItem) {
  return {
    geometry: parcela.geo?.polygon ?? parcela.geometry,
    point:
      parcela.geo?.parcelPoint ??
      parcela.parcelReferencePoint ??
      parcela.geo?.point ??
      parcela.referencePoint
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
