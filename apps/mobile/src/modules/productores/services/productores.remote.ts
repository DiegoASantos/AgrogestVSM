import {
  apiRequest,
  apiRequestAllPages,
  type ApiRequestContext
} from "../../../shared/services";
import type { Productor, CreateProductorDraft } from "../types";

export const productoresRemote = {
  getAll() {
    return apiRequestAllPages<Productor>("/productores");
  },

  getById(id: string) {
    return apiRequest<Productor>(`/productores/${id}`);
  },

  create(data: CreateProductorDraft, context: ApiRequestContext = {}) {
    return apiRequest<Productor>("/productores", {
      method: "POST",
      body: data,
      ...context
    });
  },

  update(id: string, data: CreateProductorDraft, context: ApiRequestContext = {}) {
    return apiRequest<Productor>(`/productores/${id}`, {
      method: "PATCH",
      body: data,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<Productor>(`/productores/${id}`, {
      method: "DELETE",
      ...context
    });
  }
};
