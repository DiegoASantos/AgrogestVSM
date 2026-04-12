/**
 * Shared GeoJSON geometry types for the admin web.
 * Mirrors the contract exposed by the API (apps/api/src/common/utils/geo-json.util.ts).
 * Admin web never validates raw geometry — it only consumes already-validated payloads —
 * so these are type-only aliases.
 */
export type GeoJsonPointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

export type GeoJsonMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};
