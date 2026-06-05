export type BaseMapLayerConfig = {
  id: "street" | "satellite";
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  isDefault?: boolean;
};

export const BASE_MAP_LAYERS: BaseMapLayerConfig[] = [
  {
    id: "street",
    label: "Estandar",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    isDefault: true
  },
  {
    id: "satellite",
    label: "Satelital",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19
  }
];
