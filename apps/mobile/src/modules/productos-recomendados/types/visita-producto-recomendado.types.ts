export type ProductCatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ApplicationFrequencyCatalogItem = {
  id: string;
  name: string;
  intervalDays: number | null;
  isActive: boolean;
};

export type VisitaProductoRecomendado = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  productId: string;
  dose: string;
  applicationFrequencyId: string | null;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductoRecomendadoFormValues = {
  productId: string;
  dose: string;
  applicationFrequencyId: string;
  instructions: string;
};

export type ProductoRecomendadoFormErrors = Partial<
  Record<"productId" | "dose" | "applicationFrequencyId" | "instructions", string>
>;
