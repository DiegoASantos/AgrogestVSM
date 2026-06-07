export type CatalogOption = {
  id: string;
  label: string;
};

export type CultivoCatalogItem = {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
};

export type CultivoCatalogPayload = {
  code?: string | null;
  name: string;
  isActive?: boolean;
};

export type CampaniaCatalogItem = {
  id: string;
  name: string;
  cultivoId: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampaniaCatalogPayload = {
  name: string;
  cultivoId: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  isActive?: boolean;
};

export type EtapaFenologicaCatalogItem = {
  id: string;
  cultivoId: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  type: EtapaFenologicaCatalogType;
  isActive: boolean;
};

export type EtapaFenologicaCatalogType = "Etapa" | "Labor";

export type EtapaFenologicaCatalogPayload = {
  cultivoId: string;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
  type?: EtapaFenologicaCatalogType;
  isActive?: boolean;
};

export type SubEtapaCatalogItem = {
  id: string;
  etapaFenologicaId: string;
  name: string;
  sortOrder: number;
  description: string | null;
  percentage: number | null;
  isActive: boolean;
};

export type SubEtapaCatalogPayload = {
  etapaFenologicaId: string;
  name: string;
  sortOrder: number;
  description?: string | null;
  percentage?: number | null;
  isActive?: boolean;
};

export type NivelIncidenciaCatalogItem = {
  id: string;
  name: string;
  sortOrder: number;
  type: NivelIncidenciaCatalogType;
};

export type NivelIncidenciaCatalogType = "incidencia" | "severidad";

export type NivelIncidenciaCatalogPayload = {
  name: string;
  sortOrder: number;
  type: NivelIncidenciaCatalogType;
};

export type PlagaEnfermedadCatalogType = "plaga" | "enfermedad";

export type PlagaEnfermedadCatalogItem = {
  id: string;
  scientificName: string | null;
  name: string;
  type: PlagaEnfermedadCatalogType;
  isActive: boolean;
};

export type PlagaEnfermedadCatalogPayload = {
  scientificName?: string | null;
  name: string;
  type: PlagaEnfermedadCatalogType;
  isActive?: boolean;
};

export type TipoDocumentoCatalogItem = {
  id: string;
  code: string;
  name: string;
};

export type TipoDocumentoCatalogPayload = {
  code: string;
  name: string;
};
