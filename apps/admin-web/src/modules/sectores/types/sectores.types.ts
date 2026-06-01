export type SectorListItem = {
  id: string;
  distritoId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SectorPayload = {
  distritoId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};
