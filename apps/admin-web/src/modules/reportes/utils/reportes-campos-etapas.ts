import type {
  AdminMapPoint,
  AdminMapPolygon
} from "../../../shared/components/admin-map";
import { buildPhenologicalStageColorLookup } from "../../mapas/utils/phenological-stage-colors";
import type {
  FieldsByStageFilters,
  FieldsByStageReportData
} from "../types/reportes.types";

export const emptyFieldsByStageFilters: FieldsByStageFilters = {
  agronomistUserId: "",
  productorId: ""
};

export function buildFieldsByStageMapData(report: FieldsByStageReportData) {
  const colors = buildPhenologicalStageColorLookup(report.stages);
  const polygons: AdminMapPolygon[] = [];
  const points: AdminMapPoint[] = [];
  let missingGeodataCount = 0;
  let mappableCount = 0;

  for (const parcela of report.parcels) {
    const color = colors.get(parcela.stageId) ?? "#64748b";
    const popup = {
      title: parcela.parcelName || parcela.parcelCode,
      description: [
        `Código: ${parcela.parcelCode}`,
        `Etapa o labor: ${parcela.stageName}`,
        `Ingeniero de la última visita: ${parcela.engineerName}`,
        `Productor: ${parcela.productorName}`
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
    } else if (parcela.parcelPoint || parcela.referencePoint) {
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

      mappableCount += 1;
    } else {
      missingGeodataCount += 1;
    }
  }

  return {
    colors,
    polygons,
    points,
    missingGeodataCount,
    mappableCount
  };
}
