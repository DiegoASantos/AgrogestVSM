import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";
import type {
  SecurityRoleItem,
  SecurityRolePayload,
  SecurityUserItem,
  SecurityUserPayload,
  SecurityUserRoleItem,
  SecurityUserRolePayload
} from "../types/security.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const securityService = {
  getUsers(session: AuthSessionInput) {
    return apiRequest<SecurityUserItem[]>("/usuarios", {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  createUser(session: AuthSessionInput, payload: SecurityUserPayload) {
    return apiRequest<SecurityUserItem>("/usuarios", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  updateUser(
    session: AuthSessionInput,
    id: string,
    payload: SecurityUserPayload
  ) {
    return apiRequest<SecurityUserItem>(`/usuarios/${id}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  deleteUser(session: AuthSessionInput, id: string) {
    return apiRequest<SecurityUserItem>(`/usuarios/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getRoles(session: AuthSessionInput) {
    return apiRequest<SecurityRoleItem[]>("/roles", {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  createRole(session: AuthSessionInput, payload: SecurityRolePayload) {
    return apiRequest<SecurityRoleItem>("/roles", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  updateRole(
    session: AuthSessionInput,
    id: string,
    payload: SecurityRolePayload
  ) {
    return apiRequest<SecurityRoleItem>(`/roles/${id}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  deleteRole(session: AuthSessionInput, id: string) {
    return apiRequest<SecurityRoleItem>(`/roles/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getUserRoles(
    session: AuthSessionInput,
    filters?: {
      userId?: string;
      roleId?: string;
    }
  ) {
    const searchParams = new URLSearchParams();

    if (filters?.userId) {
      searchParams.set("usuario_id", filters.userId);
    }

    if (filters?.roleId) {
      searchParams.set("rol_id", filters.roleId);
    }

    const path =
      searchParams.size > 0
        ? `/usuario-roles?${searchParams.toString()}`
        : "/usuario-roles";

    return apiRequest<SecurityUserRoleItem[]>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  createUserRole(
    session: AuthSessionInput,
    payload: SecurityUserRolePayload
  ) {
    return apiRequest<SecurityUserRoleItem>("/usuario-roles", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  updateUserRole(
    session: AuthSessionInput,
    currentUserId: string,
    currentRoleId: string,
    payload: SecurityUserRolePayload
  ) {
    return apiRequest<SecurityUserRoleItem>(
      `/usuario-roles/${currentUserId}/${currentRoleId}`,
      {
        method: "PATCH",
        body: payload,
        headers: createAuthHeaders(session.accessToken, session.tokenType)
      }
    );
  },

  deleteUserRole(
    session: AuthSessionInput,
    userId: string,
    roleId: string
  ) {
    return apiRequest<SecurityUserRoleItem>(`/usuario-roles/${userId}/${roleId}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  }
};
