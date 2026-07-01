import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated
} from "../../../shared/services";
import type {
  SubsectorListItem,
  SubsectorPayload
} from "../types/subsectores.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const subsectoresService = {
  getAll(
    session: AuthSessionInput,
    filters?: { sectorId?: string; isActive?: boolean }
  ) {
    const searchParams = new URLSearchParams();

    if (filters?.sectorId) {
      searchParams.set("sector_id", filters.sectorId);
    }

    if (typeof filters?.isActive === "boolean") {
      searchParams.set("activo", String(filters.isActive));
    }

    const path =
      searchParams.size > 0 ? `/subsectores?${searchParams}` : "/subsectores";

    return fetchAllPaginated<SubsectorListItem>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getById(session: AuthSessionInput, id: string) {
    return apiRequest<SubsectorListItem>(`/subsectores/${id}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  create(session: AuthSessionInput, payload: SubsectorPayload) {
    return apiRequest<SubsectorListItem>("/subsectores", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  update(
    session: AuthSessionInput,
    id: string,
    payload: Partial<SubsectorPayload>
  ) {
    return apiRequest<SubsectorListItem>(`/subsectores/${id}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  remove(session: AuthSessionInput, id: string) {
    return apiRequest<SubsectorListItem>(`/subsectores/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  }
};
