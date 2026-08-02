import {
  apiRequest,
  apiRequestAllPages,
  type ApiRequestContext
} from "../../../shared/services";
import type { Sector, CreateSectorDraft } from "../types";

export const sectoresRemote = {
  getAll() {
    return apiRequestAllPages<Sector>("/sectores");
  },

  create(data: CreateSectorDraft, context: ApiRequestContext = {}) {
    return apiRequest<Sector>("/sectores", {
      method: "POST",
      body: data,
      ...context
    });
  },

  update(id: string, data: CreateSectorDraft, context: ApiRequestContext = {}) {
    return apiRequest<Sector>(`/sectores/${id}`, {
      method: "PATCH",
      body: data,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<Sector>(`/sectores/${id}`, {
      method: "DELETE",
      ...context
    });
  }
};
