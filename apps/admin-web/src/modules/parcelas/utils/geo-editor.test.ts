import { describe, expect, it } from "vitest";

import {
  calculatePolygonAreaHectares,
  calculateRingAreaHectares,
  formatAreaHectares,
  validateParcelaGeodata,
  cloneGeodata,
  areGeodataEqual,
  polygonFromRing,
  getGeometryBounds
} from "./geo-editor";
import type { GeoJsonMultiPolygon, GeoJsonPoint } from "../types/parcelas.types";

const ONE_DEGREE_EQUATOR_SQUARE: number[][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0]
];

describe("geodesic parcel area", () => {
  it("calculates WGS84 area in hectares for a simple polygon", () => {
    const geometry = buildPolygon(ONE_DEGREE_EQUATOR_SQUARE);

    expect(calculatePolygonAreaHectares(geometry)).toBeCloseTo(1230877.8361, 3);
  });

  it("returns the same area regardless of ring orientation", () => {
    const clockwiseArea = calculateRingAreaHectares(ONE_DEGREE_EQUATOR_SQUARE);
    const counterClockwiseArea = calculateRingAreaHectares([
      ...ONE_DEGREE_EQUATOR_SQUARE
    ].reverse());

    expect(counterClockwiseArea).toBeCloseTo(clockwiseArea ?? 0, 6);
  });

  it("adds areas across multipolygons", () => {
    const firstArea = calculateRingAreaHectares(ONE_DEGREE_EQUATOR_SQUARE) ?? 0;
    const geometry: GeoJsonMultiPolygon = {
      type: "MultiPolygon",
      coordinates: [[ONE_DEGREE_EQUATOR_SQUARE], [offsetRing(ONE_DEGREE_EQUATOR_SQUARE, 2)]]
    };

    expect(calculatePolygonAreaHectares(geometry)).toBeCloseTo(firstArea * 2, 0);
  });

  it("subtracts holes from the outer ring area", () => {
    const outerArea = calculateRingAreaHectares(ONE_DEGREE_EQUATOR_SQUARE) ?? 0;
    const geometry: GeoJsonMultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [
          ONE_DEGREE_EQUATOR_SQUARE,
          [
            [0.25, 0.25],
            [0.75, 0.25],
            [0.75, 0.75],
            [0.25, 0.75],
            [0.25, 0.25]
          ]
        ]
      ]
    };

    const areaWithHole = calculatePolygonAreaHectares(geometry) ?? 0;

    expect(areaWithHole).toBeGreaterThan(0);
    expect(areaWithHole).toBeLessThan(outerArea);
  });

  it("formats nullable and tiny values consistently", () => {
    expect(formatAreaHectares(null)).toBe("Sin poligono");
    expect(formatAreaHectares(0.00001)).toBe("< 0.0001 ha");
    expect(formatAreaHectares(1.23456)).toBe("1.2346 ha");
  });
});

function buildPolygon(ring: number[][]): GeoJsonMultiPolygon {
  return {
    type: "MultiPolygon",
    coordinates: [[ring]]
  };
}

function offsetRing(ring: number[][], longitudeOffset: number) {
  return ring.map(([longitude, latitude]) => [longitude + longitudeOffset, latitude]);
}

describe("validateParcelaGeodata", () => {
  const point: GeoJsonPoint = { type: "Point", coordinates: [0.5, 0.5] };
  const polygon = buildPolygon(ONE_DEGREE_EQUATOR_SQUARE);

  it("should report EMPTY error when both point and polygon are null", () => {
    const result = validateParcelaGeodata({ referencePoint: null, geometry: null, neighbors: [] });
    expect(result.issues.some((i) => i.code === "EMPTY")).toBe(true);
    expect(result.canSave).toBe(false);
  });

  it("should allow save with only a reference point", () => {
    const result = validateParcelaGeodata({ referencePoint: point, geometry: null, neighbors: [] });
    expect(result.canSave).toBe(true);
  });

  it("should detect invalid polygon", () => {
    const result = validateParcelaGeodata({
      referencePoint: null,
      geometry: { type: "MultiPolygon", coordinates: [[[[0, 0], [1, 1]]]] } as GeoJsonMultiPolygon,
      neighbors: []
    });
    expect(result.issues.some((i) => i.code === "INVALID_POLYGON")).toBe(true);
  });

  it("should pass validation for valid polygon with point inside", () => {
    const result = validateParcelaGeodata({ referencePoint: point, geometry: polygon, neighbors: [] });
    expect(result.canSave).toBe(true);
  });

  it("should warn when point is outside polygon", () => {
    const result = validateParcelaGeodata({
      referencePoint: { type: "Point", coordinates: [10, 10] },
      geometry: polygon,
      neighbors: []
    });
    expect(result.issues.some((i) => i.code === "POINT_OUTSIDE_POLYGON")).toBe(true);
  });
});

describe("cloneGeodata", () => {
  it("should return null for null input", () => {
    expect(cloneGeodata(null)).toBeNull();
  });

  it("should deep-clone a point", () => {
    const point: GeoJsonPoint = { type: "Point", coordinates: [1, 2] };
    const cloned = cloneGeodata(point);
    expect(cloned).toEqual(point);
    expect(cloned).not.toBe(point);
  });
});

describe("areGeodataEqual", () => {
  it("should return true for both null", () => {
    expect(areGeodataEqual(null, null)).toBe(true);
  });

  it("should return false when one is null", () => {
    const point: GeoJsonPoint = { type: "Point", coordinates: [1, 2] };
    expect(areGeodataEqual(point, null)).toBe(false);
  });

  it("should return true for equal points", () => {
    const a: GeoJsonPoint = { type: "Point", coordinates: [1, 2] };
    const b: GeoJsonPoint = { type: "Point", coordinates: [1, 2] };
    expect(areGeodataEqual(a, b)).toBe(true);
  });
});

describe("polygonFromRing", () => {
  it("should return MultiPolygon from valid ring", () => {
    const result = polygonFromRing(ONE_DEGREE_EQUATOR_SQUARE.map(([lng, lat]) => [lng as number, lat as number] as [number, number]));
    expect(result?.type).toBe("MultiPolygon");
    expect(result?.coordinates).toHaveLength(1);
  });

  it("should return null for ring with less than 3 vertices", () => {
    expect(polygonFromRing([[0, 0], [1, 1]] as [number, number][])).toBeNull();
  });
});

describe("getGeometryBounds", () => {
  it("should return empty array for empty geometries", () => {
    expect(getGeometryBounds([])).toEqual([]);
  });

  it("should collect coordinates from points", () => {
    const pt: GeoJsonPoint = { type: "Point", coordinates: [-77, -12] };
    const bounds = getGeometryBounds([pt]);
    expect(bounds.length).toBeGreaterThan(0);
    expect(bounds[0][0]).toBe(-77);
  });
});
