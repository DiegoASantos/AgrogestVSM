import { climaCacheRepository } from "../repositories/clima-cache.repository";
import { weatherLinkStationCacheRepository } from "../repositories/weatherlink-station-cache.repository";
import type {
  ClimateDistrictCode,
  ClimateLoadResult,
  WeatherLinkHistoryLoadResult,
  WeatherLinkStation,
  WeatherLinkStationsLoadResult
} from "../types/clima.types";
import { climaRemote } from "./clima.remote";

export const climaService = {
  async getForDistrict(
    districtCode: ClimateDistrictCode,
    isOnline: boolean
  ): Promise<ClimateLoadResult> {
    if (isOnline) {
      try {
        const climate = await climaRemote.getByDistrictCode(districtCode);
        climaCacheRepository.save(climate);
        return { climate, isCached: false, isStale: false };
      } catch {
        // A cached value is safer and more useful than hiding the last estimate.
      }
    }

    const cached = climaCacheRepository.get(districtCode);
    if (!cached)
      throw new Error("No hay una estimación climática guardada para este distrito.");
    return {
      climate: cached.climate,
      isCached: true,
      isStale: new Date(cached.expiresAt).getTime() <= Date.now()
    };
  },

  async getWeatherLinkStations(
    isOnline: boolean
  ): Promise<WeatherLinkStationsLoadResult> {
    if (isOnline) {
      try {
        const stations = filterWeatherLinkStations(
          await climaRemote.getWeatherLinkStations()
        );
        weatherLinkStationCacheRepository.saveAll(stations);
        return { stations, isCached: false, isStale: false };
      } catch {
        // The last persisted observations remain useful when the API is unavailable.
      }
    }

    const cached = weatherLinkStationCacheRepository
      .getAll()
      .filter(({ station }) => station.isActive && station.sourceCode === "weatherlink");
    if (cached.length === 0) {
      throw new Error("No hay datos guardados de estaciones Davis.");
    }

    return {
      stations: cached.map(({ station }) => station),
      isCached: true,
      isStale: cached.some(({ expiresAt }) => new Date(expiresAt).getTime() <= Date.now())
    };
  },

  async getWeatherLinkHistory(
    station: WeatherLinkStation,
    desde: string,
    hasta: string,
    isOnline: boolean
  ): Promise<WeatherLinkHistoryLoadResult> {
    if (isOnline) {
      try {
        const history = await climaRemote.getWeatherLinkHistory(station.id, desde, hasta);
        weatherLinkStationCacheRepository.saveHistory(station, history);
        return {
          history,
          isCached: history.cache.hit,
          isStale: false,
          requestedRangeMatches: true
        };
      } catch {
        // The last direct query is the only WeatherLink fallback used by mobile.
      }
    }

    const cached = weatherLinkStationCacheRepository.get(station.id);
    if (!cached?.history) {
      throw new Error("No hay una consulta WeatherLink guardada para esta estacion.");
    }
    return {
      history: cached.history,
      isCached: true,
      isStale: new Date(cached.expiresAt).getTime() <= Date.now(),
      requestedRangeMatches:
        cached.history.range.desde === desde && cached.history.range.hasta === hasta
    };
  }
};

function filterWeatherLinkStations(stations: WeatherLinkStation[]) {
  return stations.filter(
    (station) => station.isActive && station.sourceCode === "weatherlink"
  );
}
