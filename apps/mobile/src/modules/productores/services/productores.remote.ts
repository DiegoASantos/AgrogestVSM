import {
  apiRequest,
  apiRequestAllPages,
  type ApiRequestContext
} from "../../../shared/services";
import type { Productor, CreateProductorDraft } from "../types";

export const productoresRemote = {
  getPendingContinuity() {
    return apiRequest<Array<{
      productorId: string;
      name: string;
      baseDate: string;
      dueDate: string;
    }>>("/productores/seguimiento-pendiente");
  },

  respondContinuity(id: string, decision: "si" | "no") {
    return apiRequest<{ productorId: string; decision: "si" | "no"; deactivatedParcelIds: string[]; producerIsActive?: boolean }>(
      `/productores/${id}/seguimiento`,
      { method: "POST", body: { decision } }
    );
  },
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
