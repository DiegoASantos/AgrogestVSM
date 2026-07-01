import { apiRequest, apiRequestAllPages } from "../../../shared/services";
import type { Parcela } from "../types";

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
  }
};
