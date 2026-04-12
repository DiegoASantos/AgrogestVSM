import { apiRequest } from "../../../shared/services";
import type { Productor } from "../types";

export const productoresRemote = {
  getAll() {
    return apiRequest<Productor[]>("/productores");
  },

  getById(id: string) {
    return apiRequest<Productor>(`/productores/${id}`);
  }
};
