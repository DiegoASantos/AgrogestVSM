import { apiRequest } from "../../../shared/services";
import type {
  ClimateDistrictCode,
  DistrictClimate,
  WeatherLinkHistory,
  WeatherLinkStation
} from "../types/clima.types";

type WeatherLinkStationResponse = Omit<WeatherLinkStation, "code" | "type"> & {
  codigo: string;
  tipo: string;
};
type WeatherLinkHistoryResponse = Omit<WeatherLinkHistory, "station"> & {
  station: WeatherLinkStationResponse;
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
  },
  async getWeatherLinkHistory(stationId: string, desde: string, hasta: string) {
    const query = new URLSearchParams({ estacion_id: stationId, desde, hasta });
    const history = await apiRequest<WeatherLinkHistoryResponse>(
      `/clima/historico?${query.toString()}`,
      { timeoutMs: 30_000 }
    );
    const { codigo, tipo, ...station } = history.station;
    return { ...history, station: { ...station, code: codigo, type: tipo } };
  }
};
