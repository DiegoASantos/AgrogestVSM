import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { DataSource } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";

const CACHE_TTL_MS = 15 * 60 * 1000;
const OPEN_METEO_TIMEOUT_MS = 8_000;

const DISTRICTS = {
  tambogrande: "Tambogrande",
  "las-lomas": "Las Lomas",
  motupe: "Motupe",
  casma: "Casma"
} as const;

type DistrictCode = keyof typeof DISTRICTS;
type ClimatePoint = {
  id: string;
  district: string;
  latitude: string;
  longitude: string;
};

export type DistrictClimateResponse = {
  district: { code: DistrictCode; name: string };
  source: {
    type: "estimated_weather_model";
    provider: "Open-Meteo";
    modelSelection: "best_match";
    fetchedAt: string;
    expiresAt: string;
  };
  current: {
    observedAt: string;
    temperatureC: number | null;
    relativeHumidityPercent: number | null;
    precipitationMm: number | null;
    windSpeedKmh: number | null;
    weatherCode: number | null;
  };
  field: {
    rainfallLast24hMm: number | null;
    et0TodayMm: number | null;
    solarRadiationTodayMjM2: number | null;
    soilMoisture3To9cmM3M3: number | null;
  };
  forecast: Array<{
    date: string;
    temperatureMinC: number | null;
    temperatureMaxC: number | null;
    precipitationMm: number | null;
    precipitationProbabilityPercent: number | null;
    et0Mm: number | null;
    solarRadiationMjM2: number | null;
    windSpeedMaxKmh: number | null;
    weatherCode: number | null;
  }>;
};

@Injectable()
export class MobileClimaService {
  private readonly cache = new Map<
    DistrictCode,
    { expiresAt: number; value: DistrictClimateResponse }
  >();

  constructor(private readonly dataSource: DataSource) {}

  async getByDistrict(districtCode: string) {
    if (!isDistrictCode(districtCode)) {
      throw new NotFoundException("Distrito climático no disponible.");
    }

    const cached = this.cache.get(districtCode);
    if (cached && cached.expiresAt > Date.now()) {
      return createSuccessResponse(cached.value);
    }

    const point = await this.findPoint(districtCode);
    const value = await this.fetchClimate(districtCode, point);
    this.cache.set(districtCode, {
      expiresAt: new Date(value.source.expiresAt).getTime(),
      value
    });
    return createSuccessResponse(value);
  }

  private async findPoint(districtCode: DistrictCode): Promise<ClimatePoint> {
    const district = DISTRICTS[districtCode];
    const rows = await this.dataSource.query(
      `SELECT id, distrito AS district, latitud AS latitude, longitud AS longitude
       FROM clima.puntos_climaticos
       WHERE activo = true AND lower(distrito) = lower($1)
       LIMIT 1`,
      [district]
    );
    if (!rows[0]) {
      throw new NotFoundException("El punto climático del distrito no está disponible.");
    }
    return rows[0] as ClimatePoint;
  }

  private async fetchClimate(districtCode: DistrictCode, point: ClimatePoint) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: point.latitude,
      longitude: point.longitude,
      timezone: "America/Lima",
      past_hours: "24",
      forecast_days: "7",
      current:
        "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
      hourly: "precipitation,et0_fao_evapotranspiration,soil_moisture_3_to_9cm",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,shortwave_radiation_sum,wind_speed_10m_max"
    }).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}.`);
      const payload = (await response.json()) as OpenMeteoPayload;
      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_MS);
      return mapPayload(districtCode, payload, fetchedAt, expiresAt);
    } catch {
      throw new ServiceUnavailableException(
        "No se pudo obtener la estimación climática en este momento."
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

type OpenMeteoPayload = {
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
  daily?: Record<string, unknown>;
};

function isDistrictCode(value: string): value is DistrictCode {
  return Object.hasOwn(DISTRICTS, value);
}

function mapPayload(
  districtCode: DistrictCode,
  payload: OpenMeteoPayload,
  fetchedAt: Date,
  expiresAt: Date
): DistrictClimateResponse {
  const current = payload.current ?? {};
  const hourly = payload.hourly ?? {};
  const daily = payload.daily ?? {};
  const precipitation = numericArray(hourly.precipitation);
  const hourlyEt0 = numericArray(hourly.et0_fao_evapotranspiration);
  const dailyEt0 = numericArray(daily.et0_fao_evapotranspiration);
  const dailySolarRadiation = numericArray(daily.shortwave_radiation_sum);
  const soilMoisture = numericArray(hourly.soil_moisture_3_to_9cm);
  const dates = stringArray(daily.time);

  return {
    district: { code: districtCode, name: DISTRICTS[districtCode] },
    source: {
      type: "estimated_weather_model",
      provider: "Open-Meteo",
      modelSelection: "best_match",
      fetchedAt: fetchedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    },
    current: {
      observedAt: stringValue(current.time) ?? fetchedAt.toISOString(),
      temperatureC: numberValue(current.temperature_2m),
      relativeHumidityPercent: numberValue(current.relative_humidity_2m),
      precipitationMm: numberValue(current.precipitation),
      windSpeedKmh: numberValue(current.wind_speed_10m),
      weatherCode: numberValue(current.weather_code)
    },
    field: {
      rainfallLast24hMm: sum(precipitation.slice(0, 24)),
      et0TodayMm: dailyEt0[0] ?? sum(hourlyEt0.slice(0, 24)),
      solarRadiationTodayMjM2: dailySolarRadiation[0] ?? null,
      soilMoisture3To9cmM3M3: latest(soilMoisture)
    },
    forecast: dates.map((date, index) => ({
      date,
      temperatureMinC: numericArray(daily.temperature_2m_min)[index] ?? null,
      temperatureMaxC: numericArray(daily.temperature_2m_max)[index] ?? null,
      precipitationMm: numericArray(daily.precipitation_sum)[index] ?? null,
      precipitationProbabilityPercent:
        numericArray(daily.precipitation_probability_max)[index] ?? null,
      et0Mm: dailyEt0[index] ?? null,
      solarRadiationMjM2: dailySolarRadiation[index] ?? null,
      windSpeedMaxKmh: numericArray(daily.wind_speed_10m_max)[index] ?? null,
      weatherCode: numericArray(daily.weather_code)[index] ?? null
    }))
  };
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
function numericArray(value: unknown) {
  return Array.isArray(value) ? value.map(numberValue) : [];
}
function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((value): value is string => typeof value === "string")
    : [];
}
function latest(values: Array<number | null>) {
  return [...values].reverse().find((value): value is number => value !== null) ?? null;
}
function sum(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null);
  return known.length
    ? Number(known.reduce((total, value) => total + value, 0).toFixed(2))
    : null;
}
