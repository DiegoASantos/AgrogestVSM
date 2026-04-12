export type SecurityRoleItem = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export type SecurityRolePayload = {
  code: string;
  name: string;
  description?: string | null;
};

export type SecurityUserItem = {
  id: string;
  publicId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: SecurityRoleItem[];
};

export type SecurityUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  password?: string;
  isActive?: boolean;
};

export type SecurityUserRoleItem = {
  userId: string;
  roleId: string;
  user: {
    id: string;
    publicId: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    isActive: boolean;
  };
  role: SecurityRoleItem;
};

export type SecurityUserRolePayload = {
  userId: string;
  roleId: string;
};
