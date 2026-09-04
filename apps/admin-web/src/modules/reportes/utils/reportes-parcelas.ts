import type {
  AdminMapPoint,
  AdminMapPolygon
} from "../../../shared/components/admin-map";
import type {
  ParcelAreaCategoryCode,
  ParcelsReportData,
  ParcelsReportFilters
} from "../types/reportes.types";

export const PARCEL_CATEGORY_COLORS: Record<ParcelAreaCategoryCode, string> = {
  MICRO: "#1d8cf8",
  PEQUENO: "#2436a8",
  MEDIANO: "#e66a2c",
  GRANDE: "#7a168f"
};

export const initialParcelsReportFilters: ParcelsReportFilters = {
  agronomistUserId: "",
  productorId: "",
  sectorId: "",
  subsectorId: "",
  status: "true"
};

export function buildParcelsReportMapData(report: ParcelsReportData) {
  const polygons: AdminMapPolygon[] = [];
  const points: AdminMapPoint[] = [];
  let mappableCount = 0;

  for (const parcela of report.parcels) {
    const color = PARCEL_CATEGORY_COLORS[parcela.category];
    const popup = {
      title: parcela.parcelName || parcela.parcelCode,
      description: [
        `Código: ${parcela.parcelCode}`,
        `Categoría: ${parcela.categoryName}`,
        `Área: ${formatHectares(parcela.areaHectares)} ha`,
        `Ingeniero asignado: ${parcela.engineerName}`,
        `Productor: ${parcela.productorName}`,
        `${parcela.sectorName} / ${parcela.subsectorName}`,
        parcela.isActive ? "Activa" : "Inactiva"
      ].join(" · ")
    };

    if (parcela.geometry) {
      polygons.push({
        id: `parcela-${parcela.parcelId}`,
        geometry: parcela.geometry,
        color,
        fillColor: color,
        popup
      });
      mappableCount += 1;
      continue;
    }

    if (parcela.parcelPoint) {
      points.push({
        id: `parcela-${parcela.parcelId}-interno`,
        geometry: parcela.parcelPoint,
        color,
        popup: {
          ...popup,
          description: `${popup.description} · Punto interno de parcela`
        }
      });
    }
    if (parcela.referencePoint) {
      points.push({
        id: `parcela-${parcela.parcelId}-acceso`,
        geometry: parcela.referencePoint,
        color,
        popup: {
          ...popup,
          description: `${popup.description} · Punto de acceso`
        }
      });
    }
    if (parcela.parcelPoint || parcela.referencePoint) mappableCount += 1;
  }

  return {
    polygons,
    points,
    mappableCount,
    missingGeodataCount: report.totals.categorizedWithoutGeodata
  };
}

function formatHectares(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value);
}
