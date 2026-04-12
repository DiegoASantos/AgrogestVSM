import type { FastifyRequest } from "fastify";

export type AuthenticatedRole = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export type AuthenticatedUserProfile = {
  publicId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  roles: AuthenticatedRole[];
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthenticatedUserProfile;
};

export type AccessTokenPayload = {
  sub: string;
  userId: string;
  email: string;
  roles: string[];
};

export type AuthenticatedRequest = FastifyRequest & {
  user: AccessTokenPayload;
};
