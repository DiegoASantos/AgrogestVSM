import { toTitleCase } from "@agrogest/utils";

import type { LoginFormValues } from "../schemas/login-form.schema";
import type {
  AuthAccessToken,
  AuthLoginResult,
  AuthUser
} from "../types/auth.types";
import { ApiError, apiRequest } from "../../../shared/services";

type LoginApiResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUserApiResponse;
};

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
  async login(values: LoginFormValues): Promise<AuthAccessToken> {
    const response = await apiRequest<LoginApiResponse>("/auth/login", {
      method: "POST",
      body: values
    });

    return {
      accessToken: response.accessToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn
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
    const token = await this.login(values);

    try {
      const user = await this.getCurrentUser(token.accessToken, token.tokenType);

      return {
        ...token,
        user
      };
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        throw new ApiError(
          "No se pudo validar la sesion con el backend.",
          error.statusCode,
          error.details
        );
      }

      throw error;
    }
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
    displayName: buildDisplayName(
      response.firstName,
      response.lastName,
      response.email
    ),
    roles: response.roles.map((role) => role.code)
  };
}

function buildDisplayName(
  firstName: string,
  lastName: string,
  email: string
) {
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return toTitleCase(fullName);
  }

  const localPart = email.split("@")[0] ?? "usuario";
  return toTitleCase(localPart.replace(/[._-]+/g, " ").trim() || "usuario");
}
