import { apiRequest } from "../../../shared/services";
import type { Distrito } from "../types/geografia.types";

export const geografiasRemote = {
  getDistritos() {
    return apiRequest<Distrito[]>("/geografias/distritos");
  }
};
