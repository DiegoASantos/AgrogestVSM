export type ProductorEntityType = "persona" | "fundo" | "cooperativa";

export type ProductorListItem = {
  id: string;
  publicId: string;
  entityType: ProductorEntityType;
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
};

export type ProductorPayload = {
  entityType?: ProductorEntityType;
  documentTypeId?: number | null;
  documentNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
};

export type ProductoresListResponse = {
  items: ProductorListItem[];
  count: number;
  page: number;
  totalPages: number;
};
