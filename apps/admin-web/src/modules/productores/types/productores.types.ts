export type ProductorListItem = {
  id: string;
  publicId: string;
  documentTypeId: number;
  documentNumber: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductorPayload = {
  documentTypeId: number;
  documentNumber: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
};
