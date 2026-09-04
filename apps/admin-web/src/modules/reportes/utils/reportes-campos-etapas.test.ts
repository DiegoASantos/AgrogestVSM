import { describe, expect, it } from "vitest";

import type { FieldsByStageReportData } from "../types/reportes.types";
import { buildFieldsByStageMapData } from "./reportes-campos-etapas";

describe("buildFieldsByStageMapData", () => {
  it("prefers the polygon and falls back to parcel or reference points", () => {
    const report = makeReport();
    const data = buildFieldsByStageMapData(report);

    expect(data.polygons.map((item) => item.id)).toEqual(["parcela-1"]);
    expect(data.points.map((item) => item.id)).toEqual([
      "parcela-2-interno",
      "parcela-2-acceso",
      "parcela-3-acceso"
    ]);
    expect(data.mappableCount).toBe(3);
    expect(data.missingGeodataCount).toBe(1);
    expect(data.polygons[0]?.fillColor).toBe(data.colors.get("stage-1"));
  });
});

function makeReport(): FieldsByStageReportData {
  const polygon = {
    type: "MultiPolygon" as const,
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
  };
  const point = { type: "Point" as const, coordinates: [-80, -5] as [number, number] };
  const parcels = [
    { parcelId: "1", geometry: polygon, parcelPoint: point, referencePoint: null },
    { parcelId: "2", geometry: null, parcelPoint: point, referencePoint: point },
    { parcelId: "3", geometry: null, parcelPoint: null, referencePoint: point },
    { parcelId: "4", geometry: null, parcelPoint: null, referencePoint: null }
  ].map((item) => ({
    ...item,
    parcelCode: `PAR-${item.parcelId}`,
    parcelName: null,
    productorId: "producer-1",
    productorName: "Productor",
    agronomistUserId: "engineer-1",
    engineerName: "Ingeniero",
    stageId: "stage-1",
    stageName: "Floración"
  }));

  return {
    stages: [{ id: "stage-1", name: "Floración", type: "Etapa", sortOrder: 1 }],
    summary: {
      totalCategorizedParcels: 4,
      uncategorizedParcels: 0,
      byStage: [{ stageId: "stage-1", count: 4, percentage: 100 }],
      byEngineer: []
    },
    parcels
  };
}
