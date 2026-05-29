export type GeoJsonPoint = {
  type: "Point";
  coordinates: [number, number];
};

export type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type ParcelaListItem = {
  id: string;
  publicId: string;
  sectorId: string;
  code: string;
  name: string | null;
  areaHectares: string | null;
  description: string | null;
  referencePoint: GeoJsonPoint | null;
  geometry: GeoJsonMultiPolygon | null;
  geo: {
    point: GeoJsonPoint | null;
    polygon: GeoJsonMultiPolygon | null;
    hasGeodata: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ParcelaPayload = {
  sectorId: string;
  code: string;
  name?: string | null;
  areaHectares?: string | null;
  description?: string | null;
  isActive?: boolean;
};
