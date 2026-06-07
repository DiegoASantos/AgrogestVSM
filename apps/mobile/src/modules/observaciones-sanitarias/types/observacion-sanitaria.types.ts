export type PestDiseaseCatalogItem = {
  id: string;
  scientificName: string | null;
  name: string;
  type: string;
  isActive: boolean;
};

export type IncidenceLevelCatalogItem = {
  id: string;
  name: string;
  sortOrder: number;
  type: "incidencia" | "severidad";
};

export type VisitaObservacionSanitaria = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  pestDiseaseId: string;
  incidenceLevelId: string | null;
  observation: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ObservacionSanitariaFormValues = {
  pestDiseaseId: string;
  incidenceLevelId: string;
  observation: string;
};

export type ObservacionSanitariaFormErrors = Partial<
  Record<"pestDiseaseId" | "incidenceLevelId" | "observation", string>
>;
