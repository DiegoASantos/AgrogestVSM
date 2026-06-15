export const ORGANOS_AFECTADOS = ["hoja", "tallo", "flores", "fruto"] as const;

export type OrganoAfectado = (typeof ORGANOS_AFECTADOS)[number];

export type PestDiseaseCatalogItem = {
  id: string;
  scientificName: string | null;
  name: string;
  type: string;
  isActive: boolean;
};

export type PestDiseaseStageLevelCatalogItem = {
  id: string;
  plagaEnfermedadId: string;
  etapaFenologicaId: string;
  nivelIncidenciaSeveridadId: string;
  description: string | null;
  isActive: boolean;
};

export type PestDiseaseByStageItem = PestDiseaseCatalogItem & {
  stageLevels: PestDiseaseStageLevelCatalogItem[];
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
  severityLevelId: string | null;
  observation: string | null;
  organosAfectados: OrganoAfectado[];
  createdAt: string;
  updatedAt: string;
};

export type VisitaStepNote = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  stepNumber: number;
  observation: string | null;
  recommendation: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ObservacionSanitariaFormValues = {
  pestDiseaseId: string;
  incidenceLevelId: string;
  severityLevelId: string;
  observation: string;
};

export type ObservacionSanitariaFormErrors = Partial<
  Record<"pestDiseaseId" | "incidenceLevelId" | "severityLevelId" | "observation", string>
>;
