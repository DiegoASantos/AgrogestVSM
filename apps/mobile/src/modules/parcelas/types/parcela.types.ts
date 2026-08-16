import type {
  GeoJsonMultiPolygonGeometry,
  GeoJsonPointGeometry
} from "../../../shared/maps/geo";

export type Parcela = {
  id: string;
  publicId: string;
  productorId: string;
  subsectorId: string;
  sectorId: string;
  code: string;
  name: string;
  areaHectares: string | null;
  description: string | null;
  referencePoint: GeoJsonPointGeometry | null;
  parcelReferencePoint: GeoJsonPointGeometry | null;
  geometry: GeoJsonMultiPolygonGeometry | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
};

export type CreateParcelaDraft = {
  publicId: string;
  productorId: string;
  subsectorId: string;
  name: string | null;
  areaHectares: string | null;
  description: string | null;
  referencePoint: GeoJsonPointGeometry | null;
  parcelReferencePoint?: GeoJsonPointGeometry | null;
  isActive?: boolean;
};
