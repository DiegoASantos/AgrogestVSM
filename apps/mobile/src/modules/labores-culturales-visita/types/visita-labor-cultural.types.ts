export type LaborCulturalCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  optionCode: string | null;
  optionLabel: string | null;
  legend: string | null;
  sortOrder: number | null;
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
