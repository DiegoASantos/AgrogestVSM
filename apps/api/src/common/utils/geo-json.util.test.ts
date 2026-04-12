import { describe, expect, it } from "vitest";

import {
  createGeoJsonFeature,
  createGeoJsonFeatureCollection,
  normalizeGeoJsonMultiPolygon,
  normalizeGeoJsonPoint
} from "./geo-json.util";

const validRing = [
  [-80.5, -5.0],
  [-80.4, -5.0],
  [-80.4, -5.1],
  [-80.5, -5.1],
  [-80.5, -5.0]
];

describe("normalizeGeoJsonPoint", () => {
  it("accepts a valid point", () => {
    const result = normalizeGeoJsonPoint({
      type: "Point",
      coordinates: [-80.63, -5.19]
    });
    expect(result).toEqual({ type: "Point", coordinates: [-80.63, -5.19] });
  });

  it("rejects null/undefined", () => {
    expect(normalizeGeoJsonPoint(null)).toBeNull();
    expect(normalizeGeoJsonPoint(undefined)).toBeNull();
  });

  it("rejects wrong type", () => {
    expect(
      normalizeGeoJsonPoint({ type: "LineString", coordinates: [-80, -5] })
    ).toBeNull();
  });

  it("rejects out-of-range longitude", () => {
    expect(
      normalizeGeoJsonPoint({ type: "Point", coordinates: [200, 0] })
    ).toBeNull();
  });

  it("rejects out-of-range latitude", () => {
    expect(
      normalizeGeoJsonPoint({ type: "Point", coordinates: [0, 100] })
    ).toBeNull();
  });

  it("rejects non-finite numbers", () => {
    expect(
      normalizeGeoJsonPoint({ type: "Point", coordinates: [Number.NaN, 0] })
    ).toBeNull();
  });

  it("rejects wrong coordinate arity", () => {
    expect(
      normalizeGeoJsonPoint({ type: "Point", coordinates: [0, 0, 0] })
    ).toBeNull();
  });
});

describe("normalizeGeoJsonMultiPolygon", () => {
  it("accepts a valid closed MultiPolygon", () => {
    const result = normalizeGeoJsonMultiPolygon({
      type: "MultiPolygon",
      coordinates: [[validRing]]
    });
    expect(result?.type).toBe("MultiPolygon");
  });

  it("rejects an empty coordinates array", () => {
    expect(
      normalizeGeoJsonMultiPolygon({ type: "MultiPolygon", coordinates: [] })
    ).toBeNull();
  });

  it("rejects a non-closed ring", () => {
    const openRing = [
      [-80.5, -5.0],
      [-80.4, -5.0],
      [-80.4, -5.1],
      [-80.5, -5.1]
    ];
    expect(
      normalizeGeoJsonMultiPolygon({
        type: "MultiPolygon",
        coordinates: [[openRing]]
      })
    ).toBeNull();
  });

  it("rejects a ring with fewer than 4 positions", () => {
    const shortRing = [
      [-80.5, -5.0],
      [-80.4, -5.0],
      [-80.5, -5.0]
    ];
    expect(
      normalizeGeoJsonMultiPolygon({
        type: "MultiPolygon",
        coordinates: [[shortRing]]
      })
    ).toBeNull();
  });

  it("rejects a ring with out-of-range coordinates", () => {
    const badRing = [
      [-200, -5.0],
      [-80.4, -5.0],
      [-80.4, -5.1],
      [-200, -5.0]
    ];
    expect(
      normalizeGeoJsonMultiPolygon({
        type: "MultiPolygon",
        coordinates: [[badRing]]
      })
    ).toBeNull();
  });
});

describe("createGeoJsonFeature / createGeoJsonFeatureCollection", () => {
  it("returns null when geometry is null", () => {
    expect(createGeoJsonFeature(null, { name: "x" })).toBeNull();
  });

  it("builds a feature with id when provided", () => {
    const feature = createGeoJsonFeature(
      { type: "Point", coordinates: [-80, -5] },
      { name: "x" },
      "id-1"
    );
    expect(feature).toEqual({
      type: "Feature",
      id: "id-1",
      geometry: { type: "Point", coordinates: [-80, -5] },
      properties: { name: "x" }
    });
  });

  it("filters null/undefined features from a collection", () => {
    const featureA = createGeoJsonFeature(
      { type: "Point", coordinates: [-80, -5] },
      { name: "a" }
    );
    const collection = createGeoJsonFeatureCollection([featureA, null, undefined]);
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(1);
  });
});
