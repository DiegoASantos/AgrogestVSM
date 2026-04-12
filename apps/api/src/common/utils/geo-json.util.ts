export type GeoJsonPosition = [number, number];

export type GeoJsonPointGeometry = {
  type: "Point";
  coordinates: GeoJsonPosition;
};

export type GeoJsonMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type GeoJsonGeometry = GeoJsonPointGeometry | GeoJsonMultiPolygonGeometry;

export type GeoJsonFeature<
  TGeometry extends GeoJsonGeometry = GeoJsonGeometry,
  TProperties extends Record<string, unknown> = Record<string, unknown>
> = {
  type: "Feature";
  id?: string;
  geometry: TGeometry;
  properties: TProperties;
};

export type GeoJsonFeatureCollection<
  TFeature extends GeoJsonFeature = GeoJsonFeature
> = {
  type: "FeatureCollection";
  features: TFeature[];
};

export function normalizeGeoJsonPoint(value: unknown): GeoJsonPointGeometry | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isRecord(value) || value.type !== "Point" || !Array.isArray(value.coordinates)) {
    return null;
  }

  if (!isValidPosition(value.coordinates)) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [value.coordinates[0], value.coordinates[1]]
  };
}

export function normalizeGeoJsonMultiPolygon(
  value: unknown
): GeoJsonMultiPolygonGeometry | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    value.type !== "MultiPolygon" ||
    !Array.isArray(value.coordinates) ||
    !hasValidMultiPolygonCoordinates(value.coordinates)
  ) {
    return null;
  }

  return {
    type: "MultiPolygon",
    coordinates: value.coordinates
  };
}

export function createGeoJsonFeature<
  TGeometry extends GeoJsonGeometry,
  TProperties extends Record<string, unknown>
>(
  geometry: TGeometry | null,
  properties: TProperties,
  id?: string
): GeoJsonFeature<TGeometry, TProperties> | null {
  if (geometry === null) {
    return null;
  }

  return {
    type: "Feature",
    ...(id ? { id } : {}),
    geometry,
    properties
  };
}

export function createGeoJsonFeatureCollection<TFeature extends GeoJsonFeature>(
  features: Array<TFeature | null | undefined>
): GeoJsonFeatureCollection<TFeature> {
  return {
    type: "FeatureCollection",
    features: features.filter(
      (feature): feature is TFeature => feature !== null && feature !== undefined
    )
  };
}

function hasValidMultiPolygonCoordinates(value: unknown): value is number[][][][] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return value.every((polygon) => {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      return false;
    }

    return polygon.every((ring) => {
      if (!Array.isArray(ring) || ring.length < 4) {
        return false;
      }

      if (!ring.every((coordinate) => isValidPosition(coordinate))) {
        return false;
      }

      return isClosedLinearRing(ring);
    });
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidPosition(value: unknown): value is GeoJsonPosition {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isValidLongitude(value[0]) &&
    isValidLatitude(value[1])
  );
}

function isValidLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

function isValidLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isClosedLinearRing(ring: GeoJsonPosition[]) {
  const firstCoordinate = ring[0];
  const lastCoordinate = ring[ring.length - 1];

  if (!firstCoordinate || !lastCoordinate) {
    return false;
  }

  return (
    firstCoordinate[0] === lastCoordinate[0] &&
    firstCoordinate[1] === lastCoordinate[1]
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
