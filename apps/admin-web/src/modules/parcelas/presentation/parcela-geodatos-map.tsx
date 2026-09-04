"use client";

import dynamic from "next/dynamic";

import type {
  GeoJsonMultiPolygon,
  GeoJsonPoint,
  ParcelaListItem
} from "../types/parcelas.types";

export type GeoEditorActionKind =
  | "place-access-point"
  | "draw-polygon"
  | "edit"
  | "move"
  | "stop"
  | "center"
  | "focus-point"
  | "delete-access-point"
  | "delete-parcel-point"
  | "delete-polygon";

export type GeoEditorMode =
  | "idle"
  | "placing-point"
  | "drawing-polygon"
  | "editing"
  | "moving";

export type GeoEditorAction = {
  kind: GeoEditorActionKind;
  nonce: number;
  point?: GeoJsonPoint;
};

export type DrawingAreaPreview = {
  vertexCount: number;
  areaHectares: number | null;
};

export type ParcelaGeodatosMapProps = {
  referencePoint: GeoJsonPoint | null;
  parcelReferencePoint: GeoJsonPoint | null;
  geometry: GeoJsonMultiPolygon | null;
  neighbors: ParcelaListItem[];
  action: GeoEditorAction | null;
  resetKey: number;
  hasUnsavedChanges: boolean;
  onChange: (nextState: {
    referencePoint: GeoJsonPoint | null;
    parcelReferencePoint: GeoJsonPoint | null;
    geometry: GeoJsonMultiPolygon | null;
  }) => void;
  onDrawingAreaChange?: (preview: DrawingAreaPreview | null) => void;
  onModeChange: (mode: GeoEditorMode) => void;
};

const ParcelaGeodatosMapClient = dynamic(
  () =>
    import("./parcela-geodatos-map.client").then(
      (module) => module.ParcelaGeodatosMapClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="geo-editor-map geo-editor-map--loading">
        <div className="admin-map__status">
          <p className="eyebrow">Geodatos</p>
          <p className="body-copy">Cargando editor geografico...</p>
        </div>
      </div>
    )
  }
);

export function ParcelaGeodatosMap(props: ParcelaGeodatosMapProps) {
  return <ParcelaGeodatosMapClient {...props} />;
}
