import type {
  GeoJsonMultiPolygonGeometry,
  GeoJsonPointGeometry
} from "../../../shared/components/admin-map";

export type ParcelaMapApiItem = {
  id: string;
  publicId: string;
  sectorId: string;
  code: string;
  name: string | null;
  areaHectares: string | number | null;
  description: string | null;
  referencePoint: GeoJsonPointGeometry | null;
  geometry: GeoJsonMultiPolygonGeometry | null;
  geo?: {
    point: GeoJsonPointGeometry | null;
    polygon: GeoJsonMultiPolygonGeometry | null;
    hasGeodata: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ParcelaMapItem = {
  id: string;
  publicId: string;
  productorId: string | null;
  sectorId: string;
  sectorName: string | null;
  productorLabel: string | null;
  code: string;
  name: string | null;
  areaHectares: string | number | null;
  description: string | null;
  referencePoint: GeoJsonPointGeometry | null;
  geometry: GeoJsonMultiPolygonGeometry | null;
  hasPoint: boolean;
  hasPolygon: boolean;
  hasGeodata: boolean;
};

export type ParcelasMapData = {
  items: ParcelaMapItem[];
  mappableItems: ParcelaMapItem[];
  missingGeodataItems: ParcelaMapItem[];
  totals: {
    activeParcelasCount: number;
    mappedParcelasCount: number;
    polygonParcelasCount: number;
    pointOnlyParcelasCount: number;
    missingGeodataCount: number;
  };
};

export type VisitaMapApiItem = {
  id: string;
  publicId: string;
  nroFicha: string | null;
  parcelaId: string;
  campaignId: string;
  agronomistUserId: string;
  visitDate: string;
  visitLocation: GeoJsonPointGeometry | null;
  geo?: {
    point: GeoJsonPointGeometry | null;
    hasGeodata: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VisitaMapItem = {
  id: string;
  publicId: string;
  nroFicha: string | null;
  productorId: string | null;
  sectorId: string | null;
  parcelaId: string;
  parcelaLabel: string | null;
  campaignId: string;
  campaignName: string | null;
  agronomistUserId: string;
  agronomistName: string | null;
  productorLabel: string | null;
  visitDate: string;
  visitLocation: GeoJsonPointGeometry | null;
  isActive: boolean;
  hasGeodata: boolean;
};

export type VisitasMapData = {
  items: VisitaMapItem[];
  mappableItems: VisitaMapItem[];
  missingGeodataItems: VisitaMapItem[];
  totals: {
    activeVisitasCount: number;
    mappedVisitasCount: number;
    missingGeodataCount: number;
  };
};

export type MapasOverviewData = {
  parcelas: ParcelasMapData;
  visitas: VisitasMapData;
};

export type SelectedMapFeature =
  | {
      kind: "parcela";
      id: string;
    }
  | {
      kind: "visita";
      id: string;
    };
