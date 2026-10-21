export type Productor = {
  id: string;
  publicId: string;
  entityType: "persona" | "fundo" | "asociacion" | "cooperativa" | "recorredor";
  documentTypeId: number | null;
  documentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAliasPublicIds?: string[];
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
};

export type CreateProductorDraft = {
  publicId: string;
  entityType: Productor["entityType"];
  firstName: string;
  lastName: string | null;
  documentTypeId: number | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};
