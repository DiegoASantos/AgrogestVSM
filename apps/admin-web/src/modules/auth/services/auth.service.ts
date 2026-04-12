import { apiRequest, ApiError } from "../../../shared/services";
import type { AuthRole, AuthSession, AuthUser, LoginValues } from "../types/auth.types";

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
  roles: AuthRole[];
};

export const authService = {
  async login(values: LoginValues): Promise<AuthSession> {
    const response = await apiRequest<LoginApiResponse>("/auth/login", {
      method: "POST",
      body: values
    });

    const user = await this.getCurrentUser(response.accessToken, response.tokenType);

    return {
      accessToken: response.accessToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
      user
    };
  },

  async getCurrentUser(accessToken: string, tokenType = "Bearer") {
    try {
      const response = await apiRequest<AuthUserApiResponse>("/auth/me", {
        headers: {
          Authorization: `${tokenType} ${accessToken}`
        }
      });

      return mapAuthUser(response);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        throw new ApiError(
          "La sesion no es valida o ya expiro.",
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
    roles: response.roles
  };
}

function buildDisplayName(firstName: string, lastName: string, email: string) {
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return email.split("@")[0] ?? "Administrador";
}
