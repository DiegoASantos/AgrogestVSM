import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated
} from "../../../shared/services";
import type { SectorListItem, SectorPayload } from "../types/sectores.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const sectoresService = {
  getAll(
    session: AuthSessionInput,
    filters?: { distritoId?: string; isActive?: boolean }
  ) {
    const searchParams = new URLSearchParams();

    if (filters?.distritoId) {
      searchParams.set("distrito_id", filters.distritoId);
    }

    if (typeof filters?.isActive === "boolean") {
      searchParams.set("activo", String(filters.isActive));
    }

    const path = searchParams.size > 0 ? `/sectores?${searchParams}` : "/sectores";

    // /sectores is paginated; walk all pages so management screens are complete.
    return fetchAllPaginated<SectorListItem>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getById(session: AuthSessionInput, id: string) {
    return apiRequest<SectorListItem>(`/sectores/${id}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getByProductor(session: AuthSessionInput, productorId: string) {
    return apiRequest<SectorListItem[]>(`/productores/${productorId}/sectores`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  create(session: AuthSessionInput, payload: SectorPayload) {
    return apiRequest<SectorListItem>("/sectores", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  update(session: AuthSessionInput, id: string, payload: Partial<SectorPayload>) {
    return apiRequest<SectorListItem>(`/sectores/${id}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  remove(session: AuthSessionInput, id: string) {
    return apiRequest<SectorListItem>(`/sectores/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  }
};
