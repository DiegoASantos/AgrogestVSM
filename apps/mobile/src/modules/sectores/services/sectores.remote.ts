import { apiRequest, apiRequestAllPages } from "../../../shared/services";
import type { Sector } from "../types";

export const sectoresRemote = {
  getAll() {
    return apiRequestAllPages<Sector>("/sectores");
  },

  getByProductorId(productorId: string) {
    return apiRequest<Sector[]>(`/productores/${productorId}/sectores`);
  }
};
