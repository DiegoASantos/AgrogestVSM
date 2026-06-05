"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import "@geoman-io/leaflet-geoman-free";

import { BaseMapLayersControl } from "../../../shared/components/base-map-layers-control";
import type {
  GeoJsonMultiPolygon,
  GeoJsonPoint,
  ParcelaListItem
} from "../types/parcelas.types";
import type {
  DrawingAreaPreview,
  GeoEditorAction,
  GeoEditorMode,
  ParcelaGeodatosMapProps
} from "./parcela-geodatos-map";
import {
  calculateRingAreaHectares,
  getGeometryBounds,
  polygonFromRing
} from "../utils/geo-editor";

const DEFAULT_CENTER: [number, number] = [-9.189967, -75.015152];
const DEFAULT_ZOOM = 6;

type Coordinate = [number, number];

type EditorLayerRefs = {
  point: L.Marker | null;
  polygon: L.Polygon | null;
  neighbors: L.LayerGroup;
};

export function ParcelaGeodatosMapClient(props: ParcelaGeodatosMapProps) {
  return (
    <div className="geo-editor-map">
      <MapContainer
        center={DEFAULT_CENTER}
        className="geo-editor-map__surface"
        scrollWheelZoom
        zoom={DEFAULT_ZOOM}
      >
        <BaseMapLayersControl />
        <GeoEditorController {...props} />
      </MapContainer>
    </div>
  );
}

function GeoEditorController({
  referencePoint,
  geometry,
  neighbors,
  action,
  resetKey,
  hasUnsavedChanges,
  onChange,
  onDrawingAreaChange,
  onModeChange
}: ParcelaGeodatosMapProps) {
  const map = useMap();
  const layersRef = useRef<EditorLayerRefs>({
    point: null,
    polygon: null,
    neighbors: L.layerGroup()
  });
  const lastSyncedSignatureRef = useRef("");
  const lastActionNonceRef = useRef<number | null>(null);
  const drawingAreaCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    layersRef.current.neighbors.addTo(map);

    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 24,
      snapVertex: true,
      snapSegment: true,
      snapMiddle: true,
      allowSelfIntersection: false,
      allowSelfIntersectionEdit: false
    });

    return () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      resetDrawingAreaTracking(drawingAreaCleanupRef, onDrawingAreaChange);
      clearEditableLayers(map, layersRef.current);
      layersRef.current.neighbors.removeFrom(map);
    };
  }, [map, onDrawingAreaChange]);

  useEffect(() => {
    syncLayersFromState({
      map,
      layers: layersRef.current,
      referencePoint,
      geometry,
      neighbors,
      hasUnsavedChanges,
      onChange
    });
    lastSyncedSignatureRef.current = createSignature(referencePoint, geometry);
    fitMapToVisibleGeodata(map, referencePoint, geometry, neighbors);
  }, [hasUnsavedChanges, map, resetKey, neighbors]);

  useEffect(() => {
    const currentSignature = createSignature(referencePoint, geometry);

    if (currentSignature === lastSyncedSignatureRef.current) {
      return;
    }

    syncLayersFromState({
      map,
      layers: layersRef.current,
      referencePoint,
      geometry,
      neighbors,
      hasUnsavedChanges,
      onChange
    });
    lastSyncedSignatureRef.current = currentSignature;
  }, [geometry, hasUnsavedChanges, map, neighbors, onChange, referencePoint]);

  useEffect(() => {
    const handleCreate = (event: { layer: L.Layer; shape: string }) => {
      if (event.shape === "Marker" && event.layer instanceof L.Marker) {
        replacePointLayer(map, layersRef.current, event.layer, onChange);
      }

      if (event.shape === "Polygon" && event.layer instanceof L.Polygon) {
        replacePolygonLayer(map, layersRef.current, event.layer, onChange, true);
      }

      resetDrawingAreaTracking(drawingAreaCleanupRef, onDrawingAreaChange);
      syncAndNotify(layersRef.current, onChange, lastSyncedSignatureRef);
      onModeChange("idle");
    };

    map.on("pm:create", handleCreate);

    return () => {
      map.off("pm:create", handleCreate);
    };
  }, [map, onChange, onDrawingAreaChange, onModeChange]);

  useEffect(() => {
    const handleDrawStart = (event: { shape?: string; workingLayer?: L.Layer }) => {
      if (event.shape !== "Polygon" || !(event.workingLayer instanceof L.Polygon)) {
        return;
      }

      trackDrawingArea(event.workingLayer, drawingAreaCleanupRef, onDrawingAreaChange);
    };

    const handleDrawEnd = () => {
      resetDrawingAreaTracking(drawingAreaCleanupRef, onDrawingAreaChange);
    };

    map.on("pm:drawstart", handleDrawStart);
    map.on("pm:drawend", handleDrawEnd);

    return () => {
      map.off("pm:drawstart", handleDrawStart);
      map.off("pm:drawend", handleDrawEnd);
      resetDrawingAreaTracking(drawingAreaCleanupRef, onDrawingAreaChange);
    };
  }, [map, onDrawingAreaChange]);

  useEffect(() => {
    if (!action || action.nonce === lastActionNonceRef.current) {
      return;
    }

    lastActionNonceRef.current = action.nonce;

    if (action.kind !== "draw-polygon") {
      resetDrawingAreaTracking(drawingAreaCleanupRef, onDrawingAreaChange);
    }

    executeAction(
      action,
      map,
      layersRef.current,
      onChange,
      onModeChange,
      lastSyncedSignatureRef
    );
  }, [action, map, onChange, onDrawingAreaChange, onModeChange]);

  return null;
}

function trackDrawingArea(
  layer: L.Polygon,
  cleanupRef: React.MutableRefObject<(() => void) | null>,
  onDrawingAreaChange?: ParcelaGeodatosMapProps["onDrawingAreaChange"]
) {
  resetDrawingAreaTracking(cleanupRef, onDrawingAreaChange, false);

  const updatePreview = () => {
    onDrawingAreaChange?.(readDrawingAreaPreview(layer));
  };

  const events = [
    "pm:vertexadded",
    "pm:vertexremoved",
    "pm:markerdrag",
    "pm:change",
    "pm:edit",
    "pm:update"
  ];

  events.forEach((eventName) => layer.on(eventName, updatePreview));
  cleanupRef.current = () => {
    events.forEach((eventName) => layer.off(eventName, updatePreview));
  };

  updatePreview();
}

function resetDrawingAreaTracking(
  cleanupRef: React.MutableRefObject<(() => void) | null>,
  onDrawingAreaChange?: ParcelaGeodatosMapProps["onDrawingAreaChange"],
  clearPreview = true
) {
  cleanupRef.current?.();
  cleanupRef.current = null;

  if (clearPreview) {
    onDrawingAreaChange?.(null);
  }
}

function readDrawingAreaPreview(layer: L.Polygon): DrawingAreaPreview {
  const ring = readOuterRing(layer);

  return {
    vertexCount: ring.length,
    areaHectares: calculateRingAreaHectares(ring)
  };
}

function syncLayersFromState({
  map,
  layers,
  referencePoint,
  geometry,
  neighbors,
  hasUnsavedChanges,
  onChange
}: {
  map: L.Map;
  layers: EditorLayerRefs;
  referencePoint: GeoJsonPoint | null;
  geometry: GeoJsonMultiPolygon | null;
  neighbors: ParcelaListItem[];
  hasUnsavedChanges: boolean;
  onChange: ParcelaGeodatosMapProps["onChange"];
}) {
  clearEditableLayers(map, layers);
  layers.neighbors.clearLayers();

  neighbors.forEach((neighbor) => {
    if (!neighbor.geometry) {
      return;
    }

    createNeighborLayers(neighbor).forEach((layer) => {
      layers.neighbors.addLayer(layer);
    });
  });

  if (geometry) {
    const polygon = createPolygonLayer(geometry, hasUnsavedChanges);
    attachPolygonEvents(polygon, layers, onChange);
    polygon.addTo(map);
    layers.polygon = polygon;
  }

  if (referencePoint) {
    const marker = createPointLayer(referencePoint, hasUnsavedChanges);
    attachPointEvents(marker, layers, onChange);
    marker.addTo(map);
    layers.point = marker;
  }
}

function executeAction(
  action: GeoEditorAction,
  map: L.Map,
  layers: EditorLayerRefs,
  onChange: ParcelaGeodatosMapProps["onChange"],
  onModeChange: (mode: GeoEditorMode) => void,
  signatureRef: React.MutableRefObject<string>
) {
  map.pm.disableDraw();
  disableLayerDrag(layers);

  if (action.kind !== "edit") {
    map.pm.disableGlobalEditMode();
  }

  if (action.kind === "stop") {
    map.pm.disableDraw();
    map.pm.disableGlobalEditMode();
    disableLayerDrag(layers);
    onModeChange("idle");
  }

  if (action.kind === "place-point") {
    onModeChange("placing-point");
    map.pm.enableDraw("Marker", {
      snappable: true,
      snapDistance: 24,
      markerStyle: {
        draggable: true,
        icon: createPointIcon()
      },
      continueDrawing: false
    });
  }

  if (action.kind === "draw-polygon") {
    onModeChange("drawing-polygon");
    map.pm.enableDraw("Polygon", {
      snappable: true,
      snapDistance: 24,
      snapVertex: true,
      snapSegment: true,
      snapMiddle: true,
      allowSelfIntersection: false,
      finishOn: "dblclick",
      pathOptions: {
        color: "#16a34a",
        fillColor: "#bbf7d0",
        fillOpacity: 0.28,
        weight: 3
      },
      continueDrawing: false,
      preventIntersection: layers.neighbors.getLayers()
    });
  }

  if (action.kind === "edit") {
    onModeChange("editing");
    map.pm.enableGlobalEditMode({
      snappable: true,
      snapDistance: 24,
      snapVertex: true,
      snapSegment: true,
      snapMiddle: true,
      allowSelfIntersection: false,
      allowSelfIntersectionEdit: false,
      preventIntersection: layers.neighbors.getLayers()
    });
  }

  if (action.kind === "move") {
    map.pm.disableGlobalEditMode();
    enableLayerDrag(layers);
    onModeChange("moving");
  }

  if (action.kind === "center") {
    fitMapToLayerRefs(map, layers);
  }

  if (action.kind === "delete-point") {
    if (layers.point) {
      layers.point.removeFrom(map);
      layers.point = null;
      onModeChange("idle");
      syncAndNotify(layers, onChange, signatureRef);
    }
  }

  if (action.kind === "delete-polygon") {
    if (layers.polygon) {
      layers.polygon.removeFrom(map);
      layers.polygon = null;
      onModeChange("idle");
      syncAndNotify(layers, onChange, signatureRef);
    }
  }
}

function replacePointLayer(
  map: L.Map,
  layers: EditorLayerRefs,
  marker: L.Marker,
  onChange: ParcelaGeodatosMapProps["onChange"]
) {
  if (layers.point) {
    layers.point.removeFrom(map);
  }

  marker.setIcon(createPointIcon(true));
  marker.dragging?.enable();
  attachPointEvents(marker, layers, onChange);
  layers.point = marker;
}

function replacePolygonLayer(
  map: L.Map,
  layers: EditorLayerRefs,
  polygon: L.Polygon,
  onChange: ParcelaGeodatosMapProps["onChange"],
  isUnsaved: boolean
) {
  if (layers.polygon) {
    layers.polygon.removeFrom(map);
  }

  polygon.setStyle({
    color: isUnsaved ? "#b45309" : "#15803d",
    fillColor: isUnsaved ? "#fde68a" : "#bbf7d0",
    fillOpacity: isUnsaved ? 0.38 : 0.34,
    dashArray: isUnsaved ? "7 5" : undefined,
    weight: 3
  });
  attachPolygonEvents(polygon, layers, onChange);
  layers.polygon = polygon;
}

function attachPointEvents(
  marker: L.Marker,
  layers: EditorLayerRefs,
  onChange: ParcelaGeodatosMapProps["onChange"]
) {
  marker.on("dragend", () => {
    onChange(readLayerState(layers));
  });
  marker.on("pm:dragend", () => {
    onChange(readLayerState(layers));
  });
}

function attachPolygonEvents(
  polygon: L.Polygon,
  layers: EditorLayerRefs,
  onChange: ParcelaGeodatosMapProps["onChange"]
) {
  const notify = () => {
    onChange(readLayerState(layers));
  };

  polygon.on("pm:edit", notify);
  polygon.on("pm:update", notify);
  polygon.on("pm:dragend", notify);
  polygon.on("pm:change", notify);
}

function syncAndNotify(
  layers: EditorLayerRefs,
  onChange: ParcelaGeodatosMapProps["onChange"],
  signatureRef: React.MutableRefObject<string>
) {
  const nextState = readLayerState(layers);
  signatureRef.current = createSignature(nextState.referencePoint, nextState.geometry);
  onChange(nextState);
}

function readLayerState(layers: EditorLayerRefs) {
  return {
    referencePoint: layers.point ? pointFromMarker(layers.point) : null,
    geometry: layers.polygon ? geometryFromPolygon(layers.polygon) : null
  };
}

function clearEditableLayers(map: L.Map, layers: EditorLayerRefs) {
  if (layers.point) {
    layers.point.removeFrom(map);
    layers.point = null;
  }

  if (layers.polygon) {
    layers.polygon.removeFrom(map);
    layers.polygon = null;
  }
}

function createPointLayer(point: GeoJsonPoint, isUnsaved = false) {
  const marker = L.marker(toLatLng(point.coordinates), {
    draggable: true,
    icon: createPointIcon(isUnsaved)
  });

  return marker;
}

function createPolygonLayer(geometry: GeoJsonMultiPolygon, isUnsaved = false) {
  return L.polygon(toLatLngPolygons(geometry), {
    color: isUnsaved ? "#b45309" : "#15803d",
    fillColor: isUnsaved ? "#fde68a" : "#bbf7d0",
    fillOpacity: isUnsaved ? 0.38 : 0.34,
    dashArray: isUnsaved ? "7 5" : undefined,
    weight: 3
  });
}

function createNeighborLayers(neighbor: ParcelaListItem) {
  if (!neighbor.geometry) {
    return [];
  }

  return neighbor.geometry.coordinates.map((polygonCoordinates) =>
    L.polygon(
      polygonCoordinates.map((ring) => ring.map(toLatLngFromArray)),
      {
        color: "#64748b",
        fillColor: "#cbd5e1",
        fillOpacity: 0.16,
        interactive: false,
        pmIgnore: true,
        snapIgnore: false,
        weight: 2
      }
    )
  );
}

function pointFromMarker(marker: L.Marker): GeoJsonPoint {
  const latLng = marker.getLatLng();

  return {
    type: "Point",
    coordinates: [roundCoordinate(latLng.lng), roundCoordinate(latLng.lat)]
  };
}

function geometryFromPolygon(polygon: L.Polygon): GeoJsonMultiPolygon | null {
  return polygonFromRing(readOuterRing(polygon));
}

function readOuterRing(polygon: L.Polygon): Coordinate[] {
  const latLngs = polygon.getLatLngs();
  const firstPolygon = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
  const outerRing = (Array.isArray(firstPolygon[0])
    ? firstPolygon[0]
    : firstPolygon) as L.LatLng[];

  return outerRing.map((latLng) => [
    roundCoordinate(latLng.lng),
    roundCoordinate(latLng.lat)
  ] as Coordinate);
}

function fitMapToVisibleGeodata(
  map: L.Map,
  referencePoint: GeoJsonPoint | null,
  geometry: GeoJsonMultiPolygon | null,
  neighbors: ParcelaListItem[]
) {
  const boundsCoordinates = getGeometryBounds([
    referencePoint,
    geometry,
    ...neighbors.map((neighbor) => neighbor.geometry)
  ]);

  fitMapToCoordinates(map, boundsCoordinates);
}

function fitMapToLayerRefs(map: L.Map, layers: EditorLayerRefs) {
  const state = readLayerState(layers);
  const neighborGeometries = layers.neighbors
    .getLayers()
    .flatMap((layer) =>
      layer instanceof L.Polygon ? [geometryFromPolygon(layer)].filter(Boolean) : []
    ) as GeoJsonMultiPolygon[];

  fitMapToCoordinates(map, [
    ...getGeometryBounds([state.referencePoint, state.geometry]),
    ...getGeometryBounds(neighborGeometries)
  ]);
}

function fitMapToCoordinates(map: L.Map, coordinates: Coordinate[]) {
  if (coordinates.length === 0) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    return;
  }

  const bounds = L.latLngBounds(coordinates.map(toLatLng));
  map.fitBounds(bounds, { padding: [32, 32], maxZoom: 18 });
}

function createSignature(
  referencePoint: GeoJsonPoint | null,
  geometry: GeoJsonMultiPolygon | null
) {
  return JSON.stringify({ referencePoint, geometry });
}

function toLatLng([longitude, latitude]: Coordinate): [number, number] {
  return [latitude, longitude];
}

function toLatLngFromArray(coordinate: number[]): [number, number] {
  return [coordinate[1], coordinate[0]];
}

function toLatLngPolygons(geometry: GeoJsonMultiPolygon) {
  return geometry.coordinates.map((polygon) =>
    polygon.map((ring) => ring.map(toLatLngFromArray))
  );
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(7));
}

function enableLayerDrag(layers: EditorLayerRefs) {
  layers.point?.pm.enableLayerDrag();
  layers.polygon?.pm.enableLayerDrag();
}

function disableLayerDrag(layers: EditorLayerRefs) {
  layers.point?.pm.disableLayerDrag();
  layers.polygon?.pm.disableLayerDrag();
}

function createPointIcon(isUnsaved = false) {
  return L.divIcon({
    className: `geo-editor-map__point-icon${
      isUnsaved ? " geo-editor-map__point-icon--unsaved" : ""
    }`,
    html: '<span aria-hidden="true"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}
