import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ParcelaEntity } from "../infrastructure/persistence/entities/parcela.entity";

const CACHE_TTL_MS = 15 * 60 * 1000;
const OPEN_METEO_TIMEOUT_MS = 8_000;

type Coordinates = { latitude: number; longitude: number };
type CachedClimate = { expiresAt: number; value: ParcelaClimateResponse };

export type ParcelaClimateResponse = {
  parcelaId: string;
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
    soilMoisture3To9cmM3M3: number | null;
  };
  forecast: Array<{
    date: string;
    temperatureMinC: number | null;
    temperatureMaxC: number | null;
    precipitationMm: number | null;
    precipitationProbabilityPercent: number | null;
    et0Mm: number | null;
    windSpeedMaxKmh: number | null;
    weatherCode: number | null;
  }>;
};

@Injectable()
export class ParcelaClimaService {
  private readonly cache = new Map<string, CachedClimate>();
  private readonly inFlight = new Map<string, Promise<ParcelaClimateResponse>>();

  constructor(
    @InjectRepository(ParcelaEntity)
    private readonly parcelasRepository: Repository<ParcelaEntity>
  ) {}

  async getByParcelaId(parcelaId: string, currentUser: AccessTokenPayload) {
    const parcela = await this.parcelasRepository.findOne({ where: { id: parcelaId } });

    if (!parcela || !parcela.isActive || !this.canAccess(parcela, currentUser)) {
      throw new NotFoundException("Parcela no encontrada.");
    }

    const cached = this.cache.get(parcelaId);
    if (cached && cached.expiresAt > Date.now()) {
      return createSuccessResponse(cached.value);
    }

    const pending = this.inFlight.get(parcelaId);
    if (pending) {
      return createSuccessResponse(await pending);
    }

    const request = this.fetchClimate(parcelaId, await this.resolveCoordinates(parcela))
      .finally(() => this.inFlight.delete(parcelaId));
    this.inFlight.set(parcelaId, request);

    return createSuccessResponse(await request);
  }

  private canAccess(parcela: ParcelaEntity, currentUser: AccessTokenPayload) {
    const isAgronomoOnly =
      currentUser.roles.includes("AGRONOMO") && !currentUser.roles.includes("ADMIN");
    return !isAgronomoOnly || parcela.agronomoUsuarioId === currentUser.userId;
  }

  private async resolveCoordinates(parcela: ParcelaEntity): Promise<Coordinates> {
    const point = parcela.referencePoint?.coordinates;
    if (point && isCoordinate(point[1], -90, 90) && isCoordinate(point[0], -180, 180)) {
      return { longitude: point[0], latitude: point[1] };
    }

    const row = await this.parcelasRepository
      .createQueryBuilder("parcela")
      .select("ST_X(ST_PointOnSurface(parcela.geometria))", "longitude")
      .addSelect("ST_Y(ST_PointOnSurface(parcela.geometria))", "latitude")
      .where("parcela.id = :id", { id: parcela.id })
      .andWhere("parcela.geometria IS NOT NULL")
      .getRawOne<{ longitude: string | number; latitude: string | number }>();
    const longitude = Number(row?.longitude);
    const latitude = Number(row?.latitude);

    if (!isCoordinate(latitude, -90, 90) || !isCoordinate(longitude, -180, 180)) {
      throw new BadRequestException(
        "La parcela no tiene una ubicación geográfica válida para consultar el clima."
      );
    }

    return { latitude, longitude };
  }

  private async fetchClimate(parcelaId: string, coordinates: Coordinates) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
      timezone: "America/Lima",
      past_hours: "24",
      forecast_days: "7",
      current:
        "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
      hourly: "precipitation,et0_fao_evapotranspiration,soil_moisture_3_to_9cm",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,wind_speed_10m_max"
    }).toString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Open-Meteo respondió ${response.status}.`);
      }

      const payload = (await response.json()) as OpenMeteoPayload;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);
      const value = mapOpenMeteoPayload(parcelaId, payload, now, expiresAt);
      this.cache.set(parcelaId, { expiresAt: expiresAt.getTime(), value });
      return value;
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

function mapOpenMeteoPayload(
  parcelaId: string,
  payload: OpenMeteoPayload,
  fetchedAt: Date,
  expiresAt: Date
): ParcelaClimateResponse {
  const current = payload.current ?? {};
  const hourly = payload.hourly ?? {};
  const daily = payload.daily ?? {};
  const precipitation = numericArray(hourly.precipitation);
  const hourlyEt0 = numericArray(hourly.et0_fao_evapotranspiration);
  const soilMoisture = numericArray(hourly.soil_moisture_3_to_9cm);
  const dailyEt0 = numericArray(daily.et0_fao_evapotranspiration);
  const dates = stringArray(daily.time);

  return {
    parcelaId,
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
      windSpeedMaxKmh: numericArray(daily.wind_speed_10m_max)[index] ?? null,
      weatherCode: numericArray(daily.weather_code)[index] ?? null
    }))
  };
}

function isCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}
function numberValue(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function stringValue(value: unknown) { return typeof value === "string" && value ? value : null; }
function numericArray(value: unknown) { return Array.isArray(value) ? value.map(numberValue) : []; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function latest(values: Array<number | null>) { return [...values].reverse().find((value) => value !== null) ?? null; }
function sum(values: Array<number | null>) { const known = values.filter((value): value is number => value !== null); return known.length ? Number(known.reduce((total, value) => total + value, 0).toFixed(2)) : null; }
