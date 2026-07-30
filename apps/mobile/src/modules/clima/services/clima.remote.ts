import { apiRequest } from "../../../shared/services";
import type { ParcelaClimate } from "../types/clima.types";

export const climaRemote = {
  getByParcelaId(parcelaId: string) {
    return apiRequest<ParcelaClimate>(`/parcelas/${parcelaId}/clima`, {
      timeoutMs: 10_000
    });
  }
};
