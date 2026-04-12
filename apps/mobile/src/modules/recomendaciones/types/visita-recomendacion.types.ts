export type RecommendationTypeCatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export type VisitaRecomendacion = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  recommendationTypeId: string;
  applies: boolean;
  detail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecomendacionFormValues = {
  recommendationTypeId: string;
  applies: string;
  detail: string;
};

export type RecomendacionFormErrors = Partial<
  Record<"recommendationTypeId" | "applies" | "detail", string>
>;
