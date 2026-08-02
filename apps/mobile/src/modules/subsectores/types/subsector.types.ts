export type Subsector = {
  id: string;
  publicId: string;
  sectorId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
};

export type CreateSubsectorDraft = {
  publicId: string;
  sectorId: string;
  name: string;
  description: string | null;
};
