export type Productor = {
  id: string;
  publicId: string;
  documentTypeId: number;
  documentNumber: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
