"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Popup,
  useMap
} from "react-leaflet";

import { BaseMapLayersControl } from "./base-map-layers-control";
import type {
  AdminMapPoint,
  AdminMapPolygon,
  AdminMapProps
} from "./admin-map";

const DEFAULT_CENTER: [number, number] = [-9.189967, -75.015152];
const DEFAULT_ZOOM = 6;
const DEFAULT_POINT_COLOR = "#166534";
const DEFAULT_POLYGON_COLOR = "#15803d";
const DEFAULT_POLYGON_FILL = "#bbf7d0";

export function AdminMapClient({
  points = [],
  polygons = [],
  viewport,
  minHeight = 440,
  emptyMessage = "No hay geodatos para mostrar todavia.",
  className
}: AdminMapProps) {
  const hasFeatures = points.length > 0 || polygons.length > 0;
  const fitBounds = useMemo(() => createFitBounds(points, polygons), [points, polygons]);
  const mapClassName = className ? `admin-map ${className}` : "admin-map";
  const center = viewport
    ? ([viewport.center.lat, viewport.center.lng] as [number, number])
    : DEFAULT_CENTER;

  return (
    <div className={mapClassName} style={{ minHeight }}>
      <MapContainer
        center={center}
        className="admin-map__surface"
        scrollWheelZoom
        zoom={viewport?.zoom ?? DEFAULT_ZOOM}
      >
        <BaseMapLayersControl />
        {!viewport && fitBounds.length > 0 ? <FitMapBounds bounds={fitBounds} /> : null}

        {polygons.flatMap((polygon) => renderPolygonFeature(polygon))}
        {points.map((point) => (
          <CircleMarker
            center={toLatLng(point.geometry.coordinates)}
            eventHandlers={point.onSelect ? { click: point.onSelect } : undefined}
            key={point.id}
            pathOptions={{
              color: point.color ?? DEFAULT_POINT_COLOR,
              fillColor: point.color ?? DEFAULT_POINT_COLOR,
              fillOpacity: point.isSelected ? 1 : 0.92,
              weight: point.isSelected ? 3 : 2
            }}
            radius={point.isSelected ? (point.radius ?? 8) + 2 : (point.radius ?? 8)}
          >
            <FeaturePopup popup={point.popup} />
          </CircleMarker>
        ))}
      </MapContainer>

      {!hasFeatures ? (
        <div className="admin-map__empty">
          <p className="body-copy">{emptyMessage}</p>
        </div>
      ) : null}
    </div>
  );
}

function FitMapBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (bounds.length === 0) {
      return;
    }

    map.fitBounds(bounds, {
      padding: [24, 24]
    });
  }, [bounds, map]);

  return null;
}

function FeaturePopup({
  popup
}: {
  popup?: {
    title?: string;
    description?: string;
  };
}) {
  if (!popup?.title && !popup?.description) {
    return null;
  }

  return (
    <Popup>
      <div className="admin-map__popup">
        {popup.title ? <strong>{popup.title}</strong> : null}
        {popup.description ? <p>{popup.description}</p> : null}
      </div>
    </Popup>
  );
}

function renderPolygonFeature(polygon: AdminMapPolygon) {
  return polygon.geometry.coordinates.map((rings, index) => {
    const positions = rings.map((ring) => ring.map(toLatLngFromArray));

    return (
      <Polygon
        eventHandlers={polygon.onSelect ? { click: polygon.onSelect } : undefined}
        key={`${polygon.id}-${index}`}
        pathOptions={{
          color: polygon.color ?? DEFAULT_POLYGON_COLOR,
          fillColor: polygon.fillColor ?? DEFAULT_POLYGON_FILL,
          fillOpacity: polygon.isSelected ? 0.45 : 0.3,
          weight: polygon.isSelected ? 3 : 2
        }}
        positions={positions}
      >
        <FeaturePopup popup={polygon.popup} />
      </Polygon>
    );
  });
}

function createFitBounds(points: AdminMapPoint[], polygons: AdminMapPolygon[]) {
  const polygonCoordinates = polygons.flatMap((polygon) =>
    polygon.geometry.coordinates.flatMap((rings) =>
      rings.flatMap((ring) => ring.map(toLatLngFromArray))
    )
  );

  return [
    ...points.map((point) => toLatLng(point.geometry.coordinates)),
    ...polygonCoordinates
  ];
}

function toLatLng([longitude, latitude]: [number, number]): [number, number] {
  return [latitude, longitude];
}

function toLatLngFromArray(coordinate: number[]): [number, number] {
  return [coordinate[1], coordinate[0]];
}
