"use client";

import type { ControlPosition } from "leaflet";
import { LayersControl, TileLayer } from "react-leaflet";

import { BASE_MAP_LAYERS } from "../constants/base-map-layers";

type BaseMapLayersControlProps = {
  position?: ControlPosition;
};

export function BaseMapLayersControl({
  position = "topright"
}: BaseMapLayersControlProps) {
  return (
    <LayersControl collapsed={false} position={position}>
      {BASE_MAP_LAYERS.map((layer) => (
        <LayersControl.BaseLayer
          checked={layer.isDefault}
          key={layer.id}
          name={layer.label}
        >
          <TileLayer
            attribution={layer.attribution}
            maxNativeZoom={layer.maxZoom}
            maxZoom={layer.maxZoom}
            url={layer.url}
          />
        </LayersControl.BaseLayer>
      ))}
    </LayersControl>
  );
}
