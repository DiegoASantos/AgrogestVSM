import { apiRequest, apiRequestAllPages } from "../../../shared/services";
import type { Productor } from "../types";

export const productoresRemote = {
  getAll() {
    return apiRequestAllPages<Productor>("/productores");
  },

  getById(id: string) {
    return apiRequest<Productor>(`/productores/${id}`);
  }
};
