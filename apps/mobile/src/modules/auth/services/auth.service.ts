import { toTitleCase } from "@agrogest/utils";

import type { LoginFormValues } from "../schemas/login-form.schema";
import type { AuthLoginResult, AuthUser } from "../types/auth.types";
import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import { getUserIdFromAccessToken } from "../../../shared/utils/auth-token";

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
  canDeleteVisits: boolean;
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
      body: values,
      networkPolicy: "essential"
    });

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
      refreshExpiresIn: response.refreshExpiresIn,
      user: mapAuthUser(response.user, response.accessToken)
    };
  },

  getCurrentUser(accessToken: string, tokenType = "Bearer") {
    return apiRequest<AuthUserApiResponse>("/auth/me", {
      headers: {
        Authorization: `${tokenType} ${accessToken}`
      }
    }).then((response) => mapAuthUser(response, accessToken));
  },

  async authenticate(values: LoginFormValues): Promise<AuthLoginResult> {
    return this.login(values);
  },

  async refresh(
    refreshToken: string,
    context: ApiRequestContext = {}
  ): Promise<AuthLoginResult> {
    const response = await apiRequest<RefreshApiResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      timeoutMs: 5_000,
      signal: context.signal
    });

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
      refreshExpiresIn: response.refreshExpiresIn,
      user: mapAuthUser(response.user, response.accessToken)
    };
  },

  logout(refreshToken: string) {
    return apiRequest<{ revoked: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken }
    });
  }
};

function mapAuthUser(response: AuthUserApiResponse, accessToken: string): AuthUser {
  return {
    userId: getUserIdFromAccessToken(accessToken),
    publicId: response.publicId,
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    phone: response.phone,
    isActive: response.isActive,
    canDeleteVisits: response.canDeleteVisits,
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
