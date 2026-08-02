import {
  apiRequest,
  apiRequestAllPages,
  type ApiRequestContext
} from "../../../shared/services";
import type { Subsector, CreateSubsectorDraft } from "../types";

export const subsectoresRemote = {
  getAll() {
    return apiRequestAllPages<Subsector>("/subsectores");
  },

  getBySectorId(sectorId: string) {
    return apiRequest<Subsector[]>(`/sectores/${sectorId}/subsectores`);
  },

  getByProductorAndSector(productorId: string, sectorId: string) {
    return apiRequest<Subsector[]>(
      `/productores/${productorId}/sectores/${sectorId}/subsectores`
    );
  },

  create(data: CreateSubsectorDraft, context: ApiRequestContext = {}) {
    return apiRequest<Subsector>("/subsectores", {
      method: "POST",
      body: data,
      ...context
    });
  },

  update(id: string, data: CreateSubsectorDraft, context: ApiRequestContext = {}) {
    return apiRequest<Subsector>(`/subsectores/${id}`, {
      method: "PATCH",
      body: data,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<Subsector>(`/subsectores/${id}`, {
      method: "DELETE",
      ...context
    });
  }
};
