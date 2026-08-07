import { describe, expect, it } from "vitest";

import { normalizeGeoJsonPoint, normalizeGeoJsonMultiPolygon, toMapCoordinate, toMapPolygonShapes, buildMapRegion } from "./geo";

describe("geo", () => {
  describe("normalizeGeoJsonPoint", () => {
    it("should return normalized Point", () => {
      const result = normalizeGeoJsonPoint({ type: "Point", coordinates: [-77.03, -12.04] });
      expect(result).toEqual({ type: "Point", coordinates: [-77.03, -12.04] });
    });

    it("should return null for non-Point type", () => {
      expect(normalizeGeoJsonPoint({ type: "LineString", coordinates: [] })).toBeNull();
    });

    it("should return null for non-object", () => {
      expect(normalizeGeoJsonPoint(null)).toBeNull();
      expect(normalizeGeoJsonPoint("string")).toBeNull();
    });

    it("should return null for invalid coordinates", () => {
      expect(normalizeGeoJsonPoint({ type: "Point", coordinates: [999, 999] })).toBeNull();
    });
  });

  describe("normalizeGeoJsonMultiPolygon", () => {
    const validRing = [[-77, -12], [-78, -12], [-78, -13], [-77, -12]];
    it("should normalize valid MultiPolygon", () => {
      const result = normalizeGeoJsonMultiPolygon({ type: "MultiPolygon", coordinates: [[validRing]] });
      expect(result?.type).toBe("MultiPolygon");
    });

    it("should return null for non-MultiPolygon", () => {
      expect(normalizeGeoJsonMultiPolygon({ type: "Point" })).toBeNull();
      expect(normalizeGeoJsonMultiPolygon(null)).toBeNull();
    });
  });

  describe("toMapCoordinate", () => {
    it("should swap lon/lat to lat/lon", () => {
      expect(toMapCoordinate([-77, -12])).toEqual({ latitude: -12, longitude: -77 });
    });
  });

  describe("toMapPolygonShapes", () => {
    const ring = [[-77, -12], [-78, -12], [-78, -13], [-77, -12]];
    it("should convert MultiPolygon to map shapes", () => {
      const geom: Parameters<typeof toMapPolygonShapes>[0] = { type: "MultiPolygon", coordinates: [[ring]] };
      const shapes = toMapPolygonShapes(geom);
      expect(shapes).toHaveLength(1);
      expect(shapes[0].coordinates[0]).toEqual({ latitude: -12, longitude: -77 });
    });
  });

  describe("buildMapRegion", () => {
    it("should compute bounding region from points", () => {
      const points = [{ type: "Point" as const, coordinates: [-77.0, -12.0] as [number, number] }] as Parameters<typeof buildMapRegion>[0];
      const region = buildMapRegion(points, []);
      expect(region?.latitude).toBe(-12.0);
      expect(region?.longitude).toBe(-77.0);
    });

    it("should return null for empty input", () => {
      expect(buildMapRegion([], [])).toBeNull();
    });
  });
});
