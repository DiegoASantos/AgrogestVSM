import {
  apiRequest,
  apiRequestAllPages,
  type ApiRequestContext
} from "../../../shared/services";
import type { Parcela, CreateParcelaDraft } from "../types";

export const parcelasRemote = {
  getAll() {
    return apiRequestAllPages<Parcela>("/parcelas");
  },

  getBySectorId(sectorId: string) {
    return apiRequest<Parcela[]>(`/sectores/${sectorId}/parcelas`);
  },

  getBySubsectorId(subsectorId: string) {
    return apiRequestAllPages<Parcela>(`/parcelas?subsector_id=${subsectorId}`);
  },

  getById(id: string) {
    return apiRequest<Parcela>(`/parcelas/${id}`);
  },

  create(data: CreateParcelaDraft, context: ApiRequestContext = {}) {
    return apiRequest<Parcela>("/parcelas", {
      method: "POST",
      body: data,
      ...context
    });
  },

  update(id: string, data: CreateParcelaDraft, context: ApiRequestContext = {}) {
    return apiRequest<Parcela>(`/parcelas/${id}`, {
      method: "PATCH",
      body: data,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<Parcela>(`/parcelas/${id}`, {
      method: "DELETE",
      ...context
    });
  }
};
