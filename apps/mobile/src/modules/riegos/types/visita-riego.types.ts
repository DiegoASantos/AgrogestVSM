export type TipoRiegoCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type VisitaRiego = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  tipoRiegoId: string;
  createdAt: string;
  updatedAt: string;
};
