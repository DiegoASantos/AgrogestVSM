"use client";

import dynamic from "next/dynamic";

export type GeoJsonPointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

export type GeoJsonMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type AdminMapPopup = {
  title?: string;
  description?: string;
};

export type AdminMapPoint = {
  id: string;
  geometry: GeoJsonPointGeometry;
  color?: string;
  radius?: number;
  popup?: AdminMapPopup;
  isSelected?: boolean;
  onSelect?: () => void;
};

export type AdminMapPolygon = {
  id: string;
  geometry: GeoJsonMultiPolygonGeometry;
  color?: string;
  fillColor?: string;
  popup?: AdminMapPopup;
  isSelected?: boolean;
  onSelect?: () => void;
};

export type AdminMapViewport = {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
};

export type AdminMapProps = {
  points?: AdminMapPoint[];
  polygons?: AdminMapPolygon[];
  viewport?: AdminMapViewport;
  minHeight?: number;
  emptyMessage?: string;
  className?: string;
};

const AdminMapClient = dynamic(
  () => import("./admin-map.client").then((module) => module.AdminMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="admin-map admin-map--loading">
        <div className="admin-map__status">
          <p className="eyebrow">Mapa</p>
          <p className="body-copy">Cargando visor geografico...</p>
        </div>
      </div>
    )
  }
);

export function AdminMap(props: AdminMapProps) {
  return <AdminMapClient {...props} />;
}
