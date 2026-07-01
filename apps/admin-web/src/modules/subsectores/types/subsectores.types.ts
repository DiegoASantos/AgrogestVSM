export type SubsectorListItem = {
  id: string;
  publicId: string;
  sectorId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubsectorPayload = {
  sectorId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};
