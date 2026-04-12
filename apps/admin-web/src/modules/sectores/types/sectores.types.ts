export type SectorListItem = {
  id: string;
  productorId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SectorPayload = {
  productorId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};
