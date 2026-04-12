import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated
} from "../../../shared/services";
import type { ProductorPayload, ProductorListItem } from "../types/productores.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const productoresService = {
  getAll(session: AuthSessionInput) {
    // /productores is paginated; fetch all pages so management screens show
    // the full list instead of the first 50 records.
    return fetchAllPaginated<ProductorListItem>("/productores", {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getById(session: AuthSessionInput, productorId: string) {
    return apiRequest<ProductorListItem>(`/productores/${productorId}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  create(session: AuthSessionInput, payload: ProductorPayload) {
    return apiRequest<ProductorListItem>("/productores", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  update(
    session: AuthSessionInput,
    productorId: string,
    payload: Partial<ProductorPayload>
  ) {
    return apiRequest<ProductorListItem>(`/productores/${productorId}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  remove(session: AuthSessionInput, productorId: string) {
    return apiRequest<ProductorListItem>(`/productores/${productorId}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  }
};
