export type LaborCulturalCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type VisitaLaborCultural = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  laborCulturalId: string;
  createdAt: string;
  updatedAt: string;
};
