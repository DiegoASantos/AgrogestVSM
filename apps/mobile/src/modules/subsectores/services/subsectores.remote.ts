import { apiRequest, apiRequestAllPages } from "../../../shared/services";
import type { Subsector } from "../types";

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
  }
};
