import type {
  GeoJsonMultiPolygon,
  GeoJsonPoint,
  ParcelaListItem
} from "../types/parcelas.types";
import { Geodesic } from "geographiclib-geodesic";

export type GeoEditorIssue = {
  code:
    | "EMPTY"
    | "INVALID_POLYGON"
    | "SELF_INTERSECTION"
    | "NEIGHBOR_OVERLAP"
    | "POINT_OUTSIDE_POLYGON";
  severity: "error" | "warning";
  message: string;
};

export type GeoEditorValidationResult = {
  issues: GeoEditorIssue[];
  canSave: boolean;
};

type Coordinate = [number, number];

const EPSILON = 1e-10;
const SQUARE_METERS_PER_HECTARE = 10000;

export function validateParcelaGeodata({
  referencePoint,
  geometry,
  neighbors
}: {
  referencePoint: GeoJsonPoint | null;
  geometry: GeoJsonMultiPolygon | null;
  neighbors: ParcelaListItem[];
}): GeoEditorValidationResult {
  const issues: GeoEditorIssue[] = [];

  if (!referencePoint && !geometry) {
    issues.push({
      code: "EMPTY",
      severity: "error",
      message: "Registra al menos un punto o un polígono antes de guardar."
    });
  }

  if (geometry && !isValidMultiPolygon(geometry)) {
    issues.push({
      code: "INVALID_POLYGON",
      severity: "error",
      message: "El polígono debe tener al menos tres vértices y estar cerrado."
    });
  }

  if (geometry && hasSelfIntersection(geometry)) {
    issues.push({
      code: "SELF_INTERSECTION",
      severity: "error",
      message: "El polígono se cruza consigo mismo. Ajusta los vértices antes de guardar."
    });
  }

  if (geometry) {
    const overlappingNeighbor = neighbors.find(
      (neighbor) => neighbor.geometry && multipolygonsOverlap(geometry, neighbor.geometry)
    );

    if (overlappingNeighbor) {
      issues.push({
        code: "NEIGHBOR_OVERLAP",
        severity: "error",
        message: `El polígono se superpone con la parcela ${buildParcelaLabel(overlappingNeighbor)}.`
      });
    }
  }

  if (referencePoint && geometry && !pointInMultiPolygon(referencePoint.coordinates, geometry)) {
    issues.push({
      code: "POINT_OUTSIDE_POLYGON",
      severity: "warning",
      message: "El punto de referencia queda fuera del polígono de la parcela."
    });
  }

  return {
    issues,
    canSave: !issues.some((issue) => issue.severity === "error")
  };
}

export function calculatePolygonAreaHectares(geometry: GeoJsonMultiPolygon | null) {
  if (!geometry) {
    return null;
  }

  const squareMeters = geometry.coordinates.reduce((polygonSum, polygon) => {
    const outerRing = polygon[0] ?? [];
    const holes = polygon.slice(1);
    const outerArea = Math.abs(calculateRingAreaSquareMeters(outerRing));
    const holesArea = holes.reduce(
      (holeSum, ring) => holeSum + Math.abs(calculateRingAreaSquareMeters(ring)),
      0
    );

    return polygonSum + Math.max(outerArea - holesArea, 0);
  }, 0);

  return squareMeters / SQUARE_METERS_PER_HECTARE;
}

export function calculateRingAreaHectares(ringInput: number[][]) {
  const ring = ringInput.map(toCoordinate);

  if (ring.length < 3) {
    return null;
  }

  return Math.abs(calculateRingAreaSquareMeters(ring)) / SQUARE_METERS_PER_HECTARE;
}

export function formatAreaHectares(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Sin poligono";
  }

  if (value < 0.0001) {
    return "< 0.0001 ha";
  }

  return `${value.toFixed(4)} ha`;
}

export function cloneGeodata<T extends GeoJsonPoint | GeoJsonMultiPolygon | null>(
  value: T
): T {
  return value ? (JSON.parse(JSON.stringify(value)) as T) : value;
}

export function areGeodataEqual(
  left: GeoJsonPoint | GeoJsonMultiPolygon | null,
  right: GeoJsonPoint | GeoJsonMultiPolygon | null
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function polygonFromRing(ring: Coordinate[]): GeoJsonMultiPolygon | null {
  const normalizedRing = closeRing(ring);

  if (normalizedRing.length < 4) {
    return null;
  }

  return {
    type: "MultiPolygon",
    coordinates: [[normalizedRing]]
  };
}

export function getGeometryBounds(geometries: Array<GeoJsonPoint | GeoJsonMultiPolygon | null>) {
  const coordinates = geometries.flatMap((geometry) => {
    if (!geometry) {
      return [];
    }

    if (geometry.type === "Point") {
      return [geometry.coordinates];
    }

    return geometry.coordinates.flatMap((polygon) =>
      polygon.flatMap((ring) => ring.map((coordinate) => toCoordinate(coordinate)))
    );
  });

  return coordinates.filter(Boolean) as Coordinate[];
}

function isValidMultiPolygon(geometry: GeoJsonMultiPolygon) {
  return geometry.coordinates.length > 0 && geometry.coordinates.every(isValidPolygon);
}

function isValidPolygon(polygon: number[][][]) {
  const outerRing = polygon[0];

  return Array.isArray(outerRing) && isClosedRing(outerRing) && outerRing.length >= 4;
}

function hasSelfIntersection(geometry: GeoJsonMultiPolygon) {
  return geometry.coordinates.some((polygon) => {
    const ring = polygon[0]?.map(toCoordinate) ?? [];

    for (let leftIndex = 0; leftIndex < ring.length - 1; leftIndex++) {
      const leftStart = ring[leftIndex];
      const leftEnd = ring[leftIndex + 1];

      for (let rightIndex = leftIndex + 1; rightIndex < ring.length - 1; rightIndex++) {
        if (Math.abs(leftIndex - rightIndex) <= 1) {
          continue;
        }

        if (leftIndex === 0 && rightIndex === ring.length - 2) {
          continue;
        }

        const rightStart = ring[rightIndex];
        const rightEnd = ring[rightIndex + 1];

        if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) {
          return true;
        }
      }
    }

    return false;
  });
}

function multipolygonsOverlap(
  currentGeometry: GeoJsonMultiPolygon,
  neighborGeometry: GeoJsonMultiPolygon
) {
  return currentGeometry.coordinates.some((currentPolygon) =>
    neighborGeometry.coordinates.some((neighborPolygon) =>
      polygonsOverlap(currentPolygon[0] ?? [], neighborPolygon[0] ?? [])
    )
  );
}

function polygonsOverlap(leftRingInput: number[][], rightRingInput: number[][]) {
  const leftRing = leftRingInput.map(toCoordinate);
  const rightRing = rightRingInput.map(toCoordinate);

  if (leftRing.length < 4 || rightRing.length < 4) {
    return false;
  }

  for (let leftIndex = 0; leftIndex < leftRing.length - 1; leftIndex++) {
    for (let rightIndex = 0; rightIndex < rightRing.length - 1; rightIndex++) {
      if (
        segmentsCrossInterior(
          leftRing[leftIndex],
          leftRing[leftIndex + 1],
          rightRing[rightIndex],
          rightRing[rightIndex + 1]
        )
      ) {
        return true;
      }
    }
  }

  const leftVertexInsideRight = leftRing
    .slice(0, -1)
    .some((coordinate) => pointInRingStrict(coordinate, rightRing));
  const rightVertexInsideLeft = rightRing
    .slice(0, -1)
    .some((coordinate) => pointInRingStrict(coordinate, leftRing));

  return leftVertexInsideRight || rightVertexInsideLeft;
}

function pointInMultiPolygon(point: Coordinate, geometry: GeoJsonMultiPolygon) {
  return geometry.coordinates.some((polygon) => {
    const outerRing = polygon[0]?.map(toCoordinate) ?? [];

    if (!pointInRing(point, outerRing)) {
      return false;
    }

    return !polygon.slice(1).some((hole) => pointInRing(point, hole.map(toCoordinate)));
  });
}

function pointInRing(point: Coordinate, ring: Coordinate[]) {
  if (ring.some((coordinate, index) => {
    const nextCoordinate = ring[index + 1];
    return nextCoordinate ? pointOnSegment(point, coordinate, nextCoordinate) : false;
  })) {
    return true;
  }

  return pointInRingStrict(point, ring);
}

function pointInRingStrict(point: Coordinate, ring: Coordinate[]) {
  let isInside = false;
  const [longitude, latitude] = point;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previousIndex];
    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function segmentsCrossInterior(
  leftStart: Coordinate,
  leftEnd: Coordinate,
  rightStart: Coordinate,
  rightEnd: Coordinate
) {
  if (!segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) {
    return false;
  }

  if (
    sameCoordinate(leftStart, rightStart) ||
    sameCoordinate(leftStart, rightEnd) ||
    sameCoordinate(leftEnd, rightStart) ||
    sameCoordinate(leftEnd, rightEnd)
  ) {
    return false;
  }

  return true;
}

function segmentsIntersect(
  leftStart: Coordinate,
  leftEnd: Coordinate,
  rightStart: Coordinate,
  rightEnd: Coordinate
) {
  const leftOrientationA = orientation(leftStart, leftEnd, rightStart);
  const leftOrientationB = orientation(leftStart, leftEnd, rightEnd);
  const rightOrientationA = orientation(rightStart, rightEnd, leftStart);
  const rightOrientationB = orientation(rightStart, rightEnd, leftEnd);

  if (leftOrientationA !== leftOrientationB && rightOrientationA !== rightOrientationB) {
    return true;
  }

  return (
    (leftOrientationA === 0 && pointOnSegment(rightStart, leftStart, leftEnd)) ||
    (leftOrientationB === 0 && pointOnSegment(rightEnd, leftStart, leftEnd)) ||
    (rightOrientationA === 0 && pointOnSegment(leftStart, rightStart, rightEnd)) ||
    (rightOrientationB === 0 && pointOnSegment(leftEnd, rightStart, rightEnd))
  );
}

function orientation(first: Coordinate, second: Coordinate, third: Coordinate) {
  const value =
    (second[1] - first[1]) * (third[0] - second[0]) -
    (second[0] - first[0]) * (third[1] - second[1]);

  if (Math.abs(value) < EPSILON) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function pointOnSegment(point: Coordinate, segmentStart: Coordinate, segmentEnd: Coordinate) {
  return (
    point[0] <= Math.max(segmentStart[0], segmentEnd[0]) + EPSILON &&
    point[0] + EPSILON >= Math.min(segmentStart[0], segmentEnd[0]) &&
    point[1] <= Math.max(segmentStart[1], segmentEnd[1]) + EPSILON &&
    point[1] + EPSILON >= Math.min(segmentStart[1], segmentEnd[1]) &&
    orientation(segmentStart, segmentEnd, point) === 0
  );
}

function calculateRingAreaSquareMeters(ringInput: number[][]) {
  const ring = closeRing(ringInput.map(toCoordinate));

  if (ring.length < 4) {
    return 0;
  }

  const polygonArea = Geodesic.WGS84.Polygon(false);

  for (const [longitude, latitude] of ring.slice(0, -1)) {
    polygonArea.AddPoint(latitude, longitude);
  }

  return polygonArea.Compute(false, true).area ?? 0;
}

function closeRing(ring: Coordinate[]) {
  if (ring.length === 0) {
    return ring;
  }

  const firstCoordinate = ring[0];
  const lastCoordinate = ring[ring.length - 1];

  if (sameCoordinate(firstCoordinate, lastCoordinate)) {
    return ring;
  }

  return [...ring, firstCoordinate];
}

function isClosedRing(ring: number[][]) {
  if (ring.length < 2) {
    return false;
  }

  return sameCoordinate(toCoordinate(ring[0]), toCoordinate(ring[ring.length - 1]));
}

function sameCoordinate(left: Coordinate, right: Coordinate) {
  return Math.abs(left[0] - right[0]) < EPSILON && Math.abs(left[1] - right[1]) < EPSILON;
}

function toCoordinate(coordinate: number[]): Coordinate {
  return [Number(coordinate[0]), Number(coordinate[1])];
}

function buildParcelaLabel(parcela: ParcelaListItem) {
  return parcela.name ? `${parcela.code} - ${parcela.name}` : parcela.code;
}
