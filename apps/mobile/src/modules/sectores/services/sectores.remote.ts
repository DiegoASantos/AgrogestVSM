import { apiRequest } from "../../../shared/services";
import type { Sector } from "../types";

export const sectoresRemote = {
  getByProductorId(productorId: string) {
    return apiRequest<Sector[]>(`/productores/${productorId}/sectores`);
  }
};
