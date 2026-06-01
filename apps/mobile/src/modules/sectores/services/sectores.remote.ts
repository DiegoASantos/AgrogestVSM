import { apiRequest } from "../../../shared/services";
import type { Sector } from "../types";

export const sectoresRemote = {
  getAll() {
    return apiRequest<Sector[]>("/sectores?limit=200");
  },

  getByProductorId(productorId: string) {
    return apiRequest<Sector[]>(`/productores/${productorId}/sectores`);
  }
};
