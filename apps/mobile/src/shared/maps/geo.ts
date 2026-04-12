export type GeoJsonPointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

export type GeoJsonMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapPolygonShape = {
  coordinates: MapCoordinate[];
  holes: MapCoordinate[][];
};

const MIN_DELTA = 0.01;

export function normalizeGeoJsonPoint(value: unknown): GeoJsonPointGeometry | null {
  if (!isRecord(value) || value.type !== "Point" || !isPosition(value.coordinates)) {
    return null;
  }

  return {
    type: "Point",
    coordinates: value.coordinates
  };
}

export function normalizeGeoJsonMultiPolygon(
  value: unknown
): GeoJsonMultiPolygonGeometry | null {
  if (
    !isRecord(value) ||
    value.type !== "MultiPolygon" ||
    !Array.isArray(value.coordinates) ||
    !value.coordinates.every(isPolygonCoordinates)
  ) {
    return null;
  }

  return {
    type: "MultiPolygon",
    coordinates: value.coordinates
  };
}

export function toMapCoordinate([longitude, latitude]: [number, number]): MapCoordinate {
  return {
    latitude,
    longitude
  };
}

export function toMapPolygonShapes(
  geometry: GeoJsonMultiPolygonGeometry
): MapPolygonShape[] {
  return geometry.coordinates
    .map((polygon) => {
      const [outerRing, ...holeRings] = polygon;

      if (!outerRing || outerRing.length === 0) {
        return null;
      }

      return {
        coordinates: outerRing.map(toMapCoordinateFromArray),
        holes: holeRings
          .filter((ring) => ring.length > 0)
          .map((ring) => ring.map(toMapCoordinateFromArray))
      };
    })
    .filter((shape): shape is MapPolygonShape => shape !== null);
}

export function buildMapRegion(
  points: GeoJsonPointGeometry[],
  polygons: GeoJsonMultiPolygonGeometry[]
): MapRegion | null {
  const coordinates = collectCoordinates(points, polygons);

  if (coordinates.length === 0) {
    return null;
  }

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.6, MIN_DELTA),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.6, MIN_DELTA)
  };
}

function collectCoordinates(
  points: GeoJsonPointGeometry[],
  polygons: GeoJsonMultiPolygonGeometry[]
) {
  return [
    ...points.map((point) => toMapCoordinate(point.coordinates)),
    ...polygons.flatMap((polygon) =>
      toMapPolygonShapes(polygon).flatMap((shape) => [
        ...shape.coordinates,
        ...shape.holes.flatMap((hole) => hole)
      ])
    )
  ];
}

function isPolygonCoordinates(value: unknown): value is number[][][] {
  return (
    Array.isArray(value) &&
    value.every((ring) => isLinearRing(ring))
  );
}

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isLongitude(value[0]) &&
    isLatitude(value[1])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLinearRing(value: unknown): value is [number, number][] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) {
    return false;
  }

  const firstPosition = value[0];
  const lastPosition = value[value.length - 1];

  if (!firstPosition || !lastPosition) {
    return false;
  }

  return (
    firstPosition[0] === lastPosition[0] &&
    firstPosition[1] === lastPosition[1]
  );
}

function isLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function toMapCoordinateFromArray(position: number[]) {
  return toMapCoordinate([position[0], position[1]]);
}
