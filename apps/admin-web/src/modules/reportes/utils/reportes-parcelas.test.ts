import { describe, expect, it } from "vitest";

import type { ParcelsReportData } from "../types/reportes.types";
import {
  buildParcelsReportMapData,
  initialParcelsReportFilters
} from "./reportes-parcelas";

describe("buildParcelsReportMapData", () => {
  it("starts with active parcels and leaves inactive or all as explicit choices", () => {
    expect(initialParcelsReportFilters.status).toBe("true");
  });

  it("uses polygons first and both point fallbacks without duplicating parcels", () => {
    const report = makeReport();
    const data = buildParcelsReportMapData(report);

    expect(data.polygons.map((item) => item.id)).toEqual(["parcela-1"]);
    expect(data.points.map((item) => item.id)).toEqual([
      "parcela-2-interno",
      "parcela-2-acceso"
    ]);
    expect(data.mappableCount).toBe(2);
    expect(data.missingGeodataCount).toBe(1);
    expect(data.polygons[0]?.fillColor).toBe("#1d8cf8");
  });
});

function makeReport(): ParcelsReportData {
  const point = { type: "Point" as const, coordinates: [-80, -5] as [number, number] };
  const baseParcel = {
    parcelCode: "PAR-001",
    parcelName: null,
    productorId: "15",
    productorName: "Rosa Díaz",
    sectorId: "2",
    sectorName: "Valle Norte",
    subsectorId: "3",
    subsectorName: "Canal A",
    agronomistUserId: "7",
    engineerName: "Ana López",
    areaHectares: 3,
    isActive: true,
    category: "MICRO" as const,
    categoryName: "Micro"
  };
  return {
    totals: {
      parcels: 3,
      hectares: 9,
      averageHectaresPerParcel: 3,
      categorizedParcels: 3,
      uncategorizedParcels: 0,
      categorizedWithoutGeodata: 1
    },
    summary: [],
    distribution: [],
    parcels: [
      {
        ...baseParcel,
        parcelId: "1",
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0]
              ]
            ]
          ]
        },
        parcelPoint: point,
        referencePoint: null
      },
      {
        ...baseParcel,
        parcelId: "2",
        geometry: null,
        parcelPoint: point,
        referencePoint: point
      },
      {
        ...baseParcel,
        parcelId: "3",
        geometry: null,
        parcelPoint: null,
        referencePoint: null
      }
    ]
  };
}
