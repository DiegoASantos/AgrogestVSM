import { BadRequestException } from "@nestjs/common";

import type {
  MultiPolygonGeometry,
  ParcelaEntity
} from "../infrastructure/persistence/entities/parcela.entity";

type Coordinate = [number, number];

const EPSILON = 1e-10;

export function assertParcelaGeodataIsPersistable({
  geometry,
  neighborParcelas
}: {
  geometry: MultiPolygonGeometry | null;
  neighborParcelas: ParcelaEntity[];
}) {
  if (!geometry) {
    return;
  }

  if (hasSelfIntersection(geometry)) {
    throw new BadRequestException(
      "geometry must not contain self-intersecting polygon rings."
    );
  }

  const overlappingNeighbor = neighborParcelas.find(
    (neighbor) => neighbor.geometry && multipolygonsOverlap(geometry, neighbor.geometry)
  );

  if (overlappingNeighbor) {
    throw new BadRequestException(
      `geometry overlaps with parcela ${buildParcelaLabel(overlappingNeighbor)}.`
    );
  }
}

function hasSelfIntersection(geometry: MultiPolygonGeometry) {
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
  currentGeometry: MultiPolygonGeometry,
  neighborGeometry: MultiPolygonGeometry
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

function pointInRingStrict(point: Coordinate, ring: Coordinate[]) {
  let isInside = false;
  const [longitude, latitude] = point;

  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index++
  ) {
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

function sameCoordinate(left: Coordinate, right: Coordinate) {
  return Math.abs(left[0] - right[0]) < EPSILON && Math.abs(left[1] - right[1]) < EPSILON;
}

function toCoordinate(coordinate: number[]): Coordinate {
  return [Number(coordinate[0]), Number(coordinate[1])];
}

function buildParcelaLabel(parcela: ParcelaEntity) {
  return parcela.name ? `${parcela.code} - ${parcela.name}` : parcela.code;
}
