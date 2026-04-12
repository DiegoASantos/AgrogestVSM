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
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  refreshExpiresIn: string;
  user: AuthenticatedUserProfile;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  refreshExpiresIn: string;
};

export type AccessTokenPayload = {
  sub: string;
  userId: string;
  email: string;
  roles: string[];
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
};

export type AuthenticatedRequest = FastifyRequest & {
  user: AccessTokenPayload;
};
