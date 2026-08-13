import { apiRequest } from "../../../shared/services";
import type {
  ClimateDistrictCode,
  DistrictClimate,
  WeatherLinkStation
} from "../types/clima.types";

type WeatherLinkStationResponse = Omit<WeatherLinkStation, "code" | "type"> & {
  codigo: string;
  tipo: string;
};

export const climaRemote = {
  getByDistrictCode(districtCode: ClimateDistrictCode) {
    return apiRequest<DistrictClimate>(`/mobile/clima/${districtCode}`, {
      timeoutMs: 10_000
    });
  },
  async getWeatherLinkStations() {
    const stations = await apiRequest<WeatherLinkStationResponse[]>("/clima/estaciones", {
      timeoutMs: 10_000
    });
    return stations.map(({ codigo, tipo, ...station }) => ({
      ...station,
      code: codigo,
      type: tipo
    }));
  }
};
