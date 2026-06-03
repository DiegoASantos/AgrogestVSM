export type CultivoCatalogItem = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type VariedadCatalogItem = {
  id: string;
  cultivoId: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type CampaniaCatalogItem = {
  id: string;
  name: string;
  cultivoId: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
};

export type EtapaFenologicaCatalogItem = {
  id: string;
  cultivoId: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  type: "Etapa" | "Labor";
  isActive: boolean;
};

export type CatalogSelectOption = {
  value: string;
  label: string;
  helper?: string;
};
