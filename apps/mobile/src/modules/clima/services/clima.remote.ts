import { apiRequest } from "../../../shared/services";
import type { ClimateDistrictCode, DistrictClimate } from "../types/clima.types";

export const climaRemote = {
  getByDistrictCode(districtCode: ClimateDistrictCode) {
    return apiRequest<DistrictClimate>(`/mobile/clima/${districtCode}`, {
      timeoutMs: 10_000
    });
  }
};
