import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  apiRequestEnvelope,
  createAuthHeaders,
  fetchAllPaginated,
  type ApiSuccessResponse
} from "../../../shared/services";
import type {
  ProductorPayload,
  ProductorListItem,
  ProductoresListResponse
} from "../types/productores.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const productoresService = {
  async getPage(
    session: AuthSessionInput,
    filters: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
    }
  ): Promise<ProductoresListResponse> {
    const searchParams = new URLSearchParams();

    searchParams.set("page", String(filters.page));
    searchParams.set("limit", String(filters.limit));

    if (filters.search?.trim()) {
      searchParams.set("search", filters.search.trim());
    }

    if (typeof filters.isActive === "boolean") {
      searchParams.set("activo", String(filters.isActive));
    }

    const response = await apiRequestEnvelope<ProductorListItem[]>(
      `/productores?${searchParams.toString()}`,
      {
        headers: createAuthHeaders(session.accessToken, session.tokenType)
      }
    );
    const count = readCount(response, response.data.length);

    return {
      items: response.data,
      count,
      page: filters.page,
      totalPages: readTotalPages(response, filters.limit, count)
    };
  },

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

function readCount<T>(response: ApiSuccessResponse<T>, fallback: number) {
  const rawTotal = response.meta?.total;

  return typeof rawTotal === "number" ? rawTotal : fallback;
}

function readTotalPages<T>(
  response: ApiSuccessResponse<T>,
  limit: number,
  count: number
) {
  const rawTotalPages = response.meta?.totalPages;

  if (typeof rawTotalPages === "number") {
    return Math.max(1, rawTotalPages);
  }

  return Math.max(1, Math.ceil(count / limit));
}
