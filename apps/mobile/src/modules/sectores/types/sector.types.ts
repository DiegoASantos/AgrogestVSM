export type Sector = {
  id: string;
  publicId: string;
  distritoId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
};

export type CreateSectorDraft = {
  publicId: string;
  distritoId: string;
  name: string;
  description: string | null;
};
