import { toTitleCase } from "@agrogest/utils";

import type { LoginFormValues } from "../schemas/login-form.schema";
import type { AuthLoginResult, AuthUser } from "../types/auth.types";
import { apiRequest } from "../../../shared/services";

type LoginApiResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  refreshExpiresIn: string;
  user: AuthUserApiResponse;
};

type RefreshApiResponse = LoginApiResponse;

type AuthUserApiResponse = {
  publicId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  roles: Array<{
    id: number;
    code: string;
    name: string;
    description: string | null;
  }>;
};

export const authService = {
  async login(values: LoginFormValues): Promise<AuthLoginResult> {
    const response = await apiRequest<LoginApiResponse>("/auth/login", {
      method: "POST",
      body: values
    });

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
      refreshExpiresIn: response.refreshExpiresIn,
      user: mapAuthUser(response.user)
    };
  },

  getCurrentUser(accessToken: string, tokenType = "Bearer") {
    return apiRequest<AuthUserApiResponse>("/auth/me", {
      headers: {
        Authorization: `${tokenType} ${accessToken}`
      }
    }).then(mapAuthUser);
  },

  async authenticate(values: LoginFormValues): Promise<AuthLoginResult> {
    return this.login(values);
  },

  async refresh(refreshToken: string): Promise<AuthLoginResult> {
    const response = await apiRequest<RefreshApiResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken }
    });

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
      refreshExpiresIn: response.refreshExpiresIn,
      user: mapAuthUser(response.user)
    };
  },

  logout(refreshToken: string) {
    return apiRequest<{ revoked: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken }
    });
  }
};

function mapAuthUser(response: AuthUserApiResponse): AuthUser {
  return {
    publicId: response.publicId,
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    phone: response.phone,
    isActive: response.isActive,
    displayName: buildDisplayName(response.firstName, response.lastName, response.email),
    roles: response.roles.map((role) => role.code)
  };
}

function buildDisplayName(firstName: string, lastName: string, email: string) {
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return toTitleCase(fullName);
  }

  const localPart = email.split("@")[0] ?? "usuario";
  return toTitleCase(localPart.replace(/[._-]+/g, " ").trim() || "usuario");
}
