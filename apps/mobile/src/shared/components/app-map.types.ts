import type {
  GeoJsonMultiPolygonGeometry,
  GeoJsonPointGeometry
} from "../maps/geo";

type AppMapFeatureBase = {
  id: string;
  title?: string;
  description?: string;
};

export type AppMapPoint = AppMapFeatureBase & {
  geometry: GeoJsonPointGeometry;
  pinColor?: string;
};

export type AppMapPolygon = AppMapFeatureBase & {
  geometry: GeoJsonMultiPolygonGeometry;
  strokeColor?: string;
  fillColor?: string;
};

export type AppMapProps = {
  points?: AppMapPoint[];
  polygons?: AppMapPolygon[];
  minHeight?: number;
  emptyMessage?: string;
};
