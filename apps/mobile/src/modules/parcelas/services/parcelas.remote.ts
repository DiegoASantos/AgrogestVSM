import { apiRequest } from "../../../shared/services";
import type { Parcela } from "../types";

export const parcelasRemote = {
  getBySectorId(sectorId: string) {
    return apiRequest<Parcela[]>(`/sectores/${sectorId}/parcelas`);
  },

  getById(id: string) {
    return apiRequest<Parcela>(`/parcelas/${id}`);
  }
};
