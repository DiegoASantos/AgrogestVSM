import type { LoginFormValues } from "../schemas/login-form.schema";

export type AuthUser = {
  publicId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  roles: string[];
};

export type AuthSessionStatus = "guest" | "authenticated";

export type AuthSession = {
  status: AuthSessionStatus;
  accessToken: string | null;
  tokenType: string | null;
  expiresIn: string | null;
  offlineSessionExpiresAt: string | null;
  user: AuthUser | null;
};

export type AuthLoginResult = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  refreshExpiresIn: string;
  user: AuthUser;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  refreshExpiresIn: string;
};

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;
