import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated
} from "../../../shared/services";
import type { ParcelaListItem, ParcelaPayload } from "../types/parcelas.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const parcelasService = {
  getAll(
    session: AuthSessionInput,
    filters?: { sectorId?: string; productorId?: string; isActive?: boolean }
  ) {
    const searchParams = new URLSearchParams();

    if (filters?.sectorId) {
      searchParams.set("sector_id", filters.sectorId);
    }

    if (filters?.productorId) {
      searchParams.set("productor_id", filters.productorId);
    }

    if (typeof filters?.isActive === "boolean") {
      searchParams.set("activo", String(filters.isActive));
    }

    const path = searchParams.size > 0 ? `/parcelas?${searchParams}` : "/parcelas";

    return fetchAllPaginated<ParcelaListItem>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getValidationContext(session: AuthSessionInput, parcela: ParcelaListItem) {
    return this.getAll(session, {
      sectorId: parcela.sectorId,
      isActive: true
    }).then((items) => items.filter((item) => item.id !== parcela.id));
  },

  getById(session: AuthSessionInput, id: string) {
    return apiRequest<ParcelaListItem>(`/parcelas/${id}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  create(session: AuthSessionInput, payload: ParcelaPayload) {
    return apiRequest<ParcelaListItem>("/parcelas", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  update(session: AuthSessionInput, id: string, payload: Partial<ParcelaPayload>) {
    return apiRequest<ParcelaListItem>(`/parcelas/${id}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  remove(session: AuthSessionInput, id: string) {
    return apiRequest<ParcelaListItem>(`/parcelas/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  }
};
