import { describe, expect, it } from "vitest";

import type { ParcelaListItem } from "../../parcelas/types/parcelas.types";
import {
  currentMonthReportFilters,
  filterAssignedReportParcelas,
  resolveReportParcelaGeodata
} from "./reportes-visitas";

describe("reportes visitas utilities", () => {
  it("starts on the current month through the current day", () => {
    expect(currentMonthReportFilters(new Date(2026, 8, 4, 15, 30))).toEqual({
      agronomistUserId: "",
      productorId: "",
      startDate: "2026-09-01",
      endDate: "2026-09-04"
    });
  });

  it("keeps only active assigned parcels matching engineer and producer", () => {
    const parcelas = [
      makeParcela({ id: "1", agronomoUsuarioId: "7", productorId: "15" }),
      makeParcela({ id: "2", agronomoUsuarioId: "8", productorId: "15" }),
      makeParcela({ id: "3", agronomoUsuarioId: null, productorId: "15" }),
      makeParcela({
        id: "4",
        agronomoUsuarioId: "7",
        productorId: "16",
        isActive: false
      })
    ];

    expect(
      filterAssignedReportParcelas(parcelas, {
        agronomistUserId: "7",
        productorId: "15"
      }).map((item) => item.id)
    ).toEqual(["1"]);
  });

  it("does not use the report date range to filter current parcel assignments", () => {
    const parcelas = [makeParcela({ id: "1", agronomoUsuarioId: "7" })];

    expect(
      filterAssignedReportParcelas(parcelas, {
        agronomistUserId: "",
        productorId: ""
      })
    ).toHaveLength(1);
  });

  it("preserves an assigned parcel that only has an internal reference point", () => {
    const parcelas = [
      makeParcela({
        parcelReferencePoint: { type: "Point", coordinates: [-80.6, -5.2] },
        geo: {
          point: null,
          parcelPoint: { type: "Point", coordinates: [-80.6, -5.2] },
          polygon: null,
          hasGeodata: true
        }
      })
    ];

    expect(resolveReportParcelaGeodata(parcelas[0]!).point).toEqual({
      type: "Point",
      coordinates: [-80.6, -5.2]
    });
  });
});

function makeParcela(overrides: Partial<ParcelaListItem>): ParcelaListItem {
  return {
    id: "1",
    publicId: "public-id",
    productorId: "15",
    subsectorId: "3",
    sectorId: "2",
    code: "PAR-001",
    name: null,
    areaHectares: null,
    description: null,
    referencePoint: null,
    geometry: null,
    agronomoUsuarioId: "7",
    geo: { point: null, polygon: null, hasGeodata: false },
    isActive: true,
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01",
    ...overrides
  };
}
