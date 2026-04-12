import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";
import type {
  ActiveIngredientItem,
  ActiveIngredientPayload,
  ProductIngredientItem,
  ProductIngredientPayload,
  ProductItem,
  ProductPayload
} from "../types/product-formulations.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const productFormulationsService = {
  getProducts(session: AuthSessionInput) {
    return apiRequest<ProductItem[]>("/productos", {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  createProduct(session: AuthSessionInput, payload: ProductPayload) {
    return apiRequest<ProductItem>("/productos", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  updateProduct(
    session: AuthSessionInput,
    id: string,
    payload: ProductPayload
  ) {
    return apiRequest<ProductItem>(`/productos/${id}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  deleteProduct(session: AuthSessionInput, id: string) {
    return apiRequest<ProductItem>(`/productos/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getActiveIngredients(session: AuthSessionInput) {
    return apiRequest<ActiveIngredientItem[]>("/ingredientes-activos", {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  createActiveIngredient(
    session: AuthSessionInput,
    payload: ActiveIngredientPayload
  ) {
    return apiRequest<ActiveIngredientItem>("/ingredientes-activos", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  updateActiveIngredient(
    session: AuthSessionInput,
    id: string,
    payload: ActiveIngredientPayload
  ) {
    return apiRequest<ActiveIngredientItem>(`/ingredientes-activos/${id}`, {
      method: "PATCH",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  deleteActiveIngredient(session: AuthSessionInput, id: string) {
    return apiRequest<ActiveIngredientItem>(`/ingredientes-activos/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getProductIngredients(
    session: AuthSessionInput,
    filters?: {
      productId?: string;
      ingredientActiveId?: string;
    }
  ) {
    const searchParams = new URLSearchParams();

    if (filters?.productId) {
      searchParams.set("producto_id", filters.productId);
    }

    if (filters?.ingredientActiveId) {
      searchParams.set("ingrediente_activo_id", filters.ingredientActiveId);
    }

    const path =
      searchParams.size > 0
        ? `/producto-ingredientes?${searchParams.toString()}`
        : "/producto-ingredientes";

    return apiRequest<ProductIngredientItem[]>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  createProductIngredient(
    session: AuthSessionInput,
    payload: ProductIngredientPayload
  ) {
    return apiRequest<ProductIngredientItem>("/producto-ingredientes", {
      method: "POST",
      body: payload,
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  updateProductIngredient(
    session: AuthSessionInput,
    currentProductId: string,
    currentIngredientActiveId: string,
    payload: ProductIngredientPayload
  ) {
    return apiRequest<ProductIngredientItem>(
      `/producto-ingredientes/${currentProductId}/${currentIngredientActiveId}`,
      {
        method: "PATCH",
        body: payload,
        headers: createAuthHeaders(session.accessToken, session.tokenType)
      }
    );
  },

  deleteProductIngredient(
    session: AuthSessionInput,
    productId: string,
    ingredientActiveId: string
  ) {
    return apiRequest<ProductIngredientItem>(
      `/producto-ingredientes/${productId}/${ingredientActiveId}`,
      {
        method: "DELETE",
        headers: createAuthHeaders(session.accessToken, session.tokenType)
      }
    );
  }
};
