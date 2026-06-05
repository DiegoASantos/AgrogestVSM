import { describe, expect, it } from "vitest";

import {
  calculatePolygonAreaHectares,
  calculateRingAreaHectares,
  formatAreaHectares
} from "./geo-editor";
import type { GeoJsonMultiPolygon } from "../types/parcelas.types";

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
