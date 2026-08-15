import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { DataSource } from "typeorm";

import {
  WeatherLinkClient,
  WeatherLinkRequestError
} from "../infrastructure/weatherlink/weatherlink.client";
import { normalizeWeatherLinkPayload } from "../infrastructure/weatherlink/weatherlink.mapper";
import type {
  NormalizedWeatherLinkReading,
  WeatherLinkStation
} from "../infrastructure/weatherlink/weatherlink.types";
import { zonedMidnightEpochSeconds } from "./weatherlink-sync.service";

const MAX_RANGE_DAYS = 7;
const CACHE_TTL_MS = 10 * 60_000;
const USER_QUERY_LIMIT = 10;
const USER_QUERY_WINDOW_MS = 60 * 60_000;

type StationRow = Record<string, unknown> & {
  id: string;
  publicId: string;
  codigo: string;
};

type DayCacheEntry = {
  readings: NormalizedWeatherLinkReading[];
  expiresAt: number;
};

export type WeatherLinkDailySummary = {
  date: string;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  relativeHumidityAveragePercent: number | null;
  precipitationTotalMm: number | null;
  windSpeedMaxKmh: number | null;
  evapotranspirationTotalMm: number | null;
  solarRadiationAverageWm2: number | null;
  readingsCount: number;
};

@Injectable()
export class WeatherLinkQueryService {
  private readonly dayCache = new Map<string, DayCacheEntry>();
  private readonly userQueries = new Map<string, number[]>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly client: WeatherLinkClient
  ) {}

  async history(
    publicId: string,
    from: string | undefined,
    to: string | undefined,
    userId: string
  ) {
    if (!this.client.config.enabled) {
      throw new ServiceUnavailableException(
        "La consulta WeatherLink no esta habilitada."
      );
    }
    const range = validateWeatherLinkRange(
      from,
      to,
      new Date(),
      this.client.config.timeZone
    );
    const station = await this.station(publicId);
    this.assertRateLimit(userId);

    const externalId = station.codigo.replace(/^weatherlink:/u, "");
    const results: Array<{ day: string; entry: DayCacheEntry; hit: boolean }> = [];
    for (let index = 0; index < range.days.length; index += 2) {
      const batch = range.days.slice(index, index + 2);
      results.push(
        ...(await Promise.all(
          batch.map(async (day) => {
            const result = await this.readDay(externalId, day);
            return { day, ...result };
          })
        ))
      );
    }

    const fetchedAt = new Date().toISOString();
    const rows = results
      .flatMap(({ entry }) => entry.readings)
      .sort((left, right) => left.dataAt.localeCompare(right.dataAt))
      .map((reading) => ({
        ...reading,
        type: "OBSERVADO",
        receivedAt: fetchedAt,
        model: "WeatherLink v2",
        source: "WeatherLink Davis",
        sourceCode: "weatherlink"
      }));

    return {
      station: toPublicStation(station),
      range: {
        desde: range.from,
        hasta: range.to,
        timeZone: this.client.config.timeZone
      },
      fetchedAt,
      cache: {
        hit: results.every((result) => result.hit),
        expiresAt: new Date(
          Math.min(...results.map(({ entry }) => entry.expiresAt))
        ).toISOString()
      },
      rows,
      daily: results.map(({ day, entry }) => summarizeWeatherLinkDay(day, entry.readings))
    };
  }

  status() {
    return {
      enabled: this.client.config.enabled,
      running: false,
      mode: "DIRECT_QUERY" as const,
      timeZone: this.client.config.timeZone,
      maxRangeDays: MAX_RANGE_DAYS,
      cacheTtlMs: CACHE_TTL_MS
    };
  }

  async setStationActive(publicId: string, isActive: boolean) {
    const rows = await this.dataSource.query(
      `UPDATE clima.estaciones_meteorologicas e
       SET activo = $2, actualizado_at = now()
       FROM clima.fuentes_datos f
       WHERE e.fuente_id = f.id AND f.codigo = 'weatherlink' AND e.public_id = $1
       RETURNING e.public_id AS "publicId", e.activo AS "isActive"`,
      [publicId, isActive]
    );
    if (!rows[0]) throw new NotFoundException("Estacion WeatherLink no encontrada.");
    return rows[0];
  }

  async refreshStations() {
    if (!this.client.config.enabled) {
      throw new ServiceUnavailableException(
        "La consulta WeatherLink no esta habilitada."
      );
    }
    const [source] = await this.dataSource.query(
      "SELECT id FROM clima.fuentes_datos WHERE codigo='weatherlink'"
    );
    if (!source?.id) {
      throw new ServiceUnavailableException("La fuente WeatherLink no esta configurada.");
    }
    const remoteStations = await this.client.stations();
    let updated = 0;
    for (const remote of remoteStations) {
      if (await this.upsertStation(String(source.id), remote)) updated += 1;
    }
    return { updated };
  }

  private async readDay(externalId: string, day: string) {
    const key = `${externalId}:${day}`;
    const cached = this.dayCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return { entry: cached, hit: true };

    const nextDay = addIsoDays(day, 1);
    try {
      const payload = await this.client.historic(
        externalId,
        zonedMidnightEpochSeconds(day, this.client.config.timeZone),
        zonedMidnightEpochSeconds(nextDay, this.client.config.timeZone)
      );
      const entry = {
        readings: normalizeWeatherLinkPayload(payload),
        expiresAt: Date.now() + CACHE_TTL_MS
      };
      this.dayCache.set(key, entry);
      return { entry, hit: false };
    } catch (error) {
      if (error instanceof WeatherLinkRequestError) {
        if (error.status === 429) {
          throw new HttpException(
            "WeatherLink limito temporalmente las consultas. Intente mas tarde.",
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
        throw new ServiceUnavailableException(error.message);
      }
      throw new ServiceUnavailableException(
        "No se pudieron consultar las lecturas WeatherLink."
      );
    }
  }

  private async station(publicId: string): Promise<StationRow> {
    const rows = await this.dataSource.query(
      `SELECT e.id, e.public_id AS "publicId", e.nombre, e.codigo, e.tipo,
        e.latitud::float AS latitude, e.longitud::float AS longitude,
        e.estado, e.variables_json AS variables,
        e.ultima_comunicacion_at AS "lastCommunicationAt", e.activo AS "isActive",
        f.codigo AS "sourceCode", f.nombre AS source
       FROM clima.estaciones_meteorologicas e
       JOIN clima.fuentes_datos f ON f.id=e.fuente_id
       WHERE e.public_id=$1 AND e.activo=true AND f.codigo='weatherlink'`,
      [publicId]
    );
    if (!rows[0])
      throw new NotFoundException("Estacion WeatherLink no encontrada o inactiva.");
    return rows[0] as StationRow;
  }

  private assertRateLimit(userId: string) {
    const now = Date.now();
    const recent = (this.userQueries.get(userId) ?? []).filter(
      (timestamp) => timestamp > now - USER_QUERY_WINDOW_MS
    );
    if (recent.length >= USER_QUERY_LIMIT) {
      throw new HttpException(
        "Se alcanzo el limite de consultas WeatherLink. Intente mas tarde.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    recent.push(now);
    this.userQueries.set(userId, recent);
  }

  private async upsertStation(sourceId: string, remote: WeatherLinkStation) {
    const externalId = String(remote.station_id_uuid ?? remote.station_id ?? "").trim();
    if (!externalId) return false;
    const name = String(remote.station_name ?? `Davis ${externalId}`)
      .trim()
      .slice(0, 150);
    await this.dataSource.query(
      `INSERT INTO clima.estaciones_meteorologicas(
        nombre,codigo,tipo,fuente_id,latitud,longitud,altitud_m,estado,activo
      ) VALUES($1,$2,'PROPIA',$3,$4,$5,$6,'OPERATIVA',true)
      ON CONFLICT(codigo) DO UPDATE SET
        nombre=EXCLUDED.nombre, fuente_id=EXCLUDED.fuente_id,
        latitud=COALESCE(EXCLUDED.latitud,clima.estaciones_meteorologicas.latitud),
        longitud=COALESCE(EXCLUDED.longitud,clima.estaciones_meteorologicas.longitud),
        altitud_m=COALESCE(EXCLUDED.altitud_m,clima.estaciones_meteorologicas.altitud_m),
        estado='OPERATIVA', actualizado_at=now()`,
      [
        name,
        `weatherlink:${externalId}`,
        sourceId,
        finite(remote.latitude),
        finite(remote.longitude),
        finite(remote.elevation)
      ]
    );
    return true;
  }
}

export function validateWeatherLinkRange(
  from: string | undefined,
  to: string | undefined,
  now: Date,
  timeZone: string
) {
  if (!from || !to) {
    throw new BadRequestException("Indique desde y hasta para consultar WeatherLink.");
  }
  if (!isIsoDay(from) || !isIsoDay(to)) {
    throw new BadRequestException("Las fechas WeatherLink deben usar YYYY-MM-DD.");
  }
  if (from > to) {
    throw new BadRequestException(
      "La fecha desde no puede ser posterior a la fecha hasta."
    );
  }
  const yesterday = addIsoDays(zonedDateKey(now, timeZone), -1);
  if (to > yesterday) {
    throw new BadRequestException(
      "WeatherLink solo permite consultar hasta el dia anterior."
    );
  }
  const days = isoDays(from, to);
  if (days.length > MAX_RANGE_DAYS) {
    throw new BadRequestException("El rango WeatherLink no puede superar 7 dias.");
  }
  return { from, to, days };
}

export function summarizeWeatherLinkDay(
  date: string,
  readings: NormalizedWeatherLinkReading[]
): WeatherLinkDailySummary {
  const temperatures = values(readings, "temperature_2m");
  const humidities = values(readings, "relative_humidity_2m");
  const precipitation = values(readings, "precipitation");
  const winds = values(readings, "wind_speed_10m");
  const evapotranspiration = values(readings, "et0_fao_evapotranspiration");
  const solarRadiation = values(readings, "shortwave_radiation");
  return {
    date,
    temperatureMinC: minimum(temperatures),
    temperatureMaxC: maximum(temperatures),
    relativeHumidityAveragePercent: average(humidities),
    precipitationTotalMm: sumOrNull(precipitation),
    windSpeedMaxKmh: maximum(winds),
    evapotranspirationTotalMm: sumOrNull(evapotranspiration),
    solarRadiationAverageWm2: average(solarRadiation),
    readingsCount: readings.length
  };
}

function toPublicStation(station: StationRow) {
  return {
    id: station.publicId,
    publicId: station.publicId,
    name: String(station.nombre ?? "Estacion Davis"),
    codigo: String(station.codigo ?? ""),
    tipo: String(station.tipo ?? ""),
    latitude: finite(station.latitude),
    longitude: finite(station.longitude),
    estado: String(station.estado ?? "OPERATIVA"),
    variables: Array.isArray(station.variables) ? station.variables : [],
    lastCommunicationAt: station.lastCommunicationAt ?? null,
    isActive: station.isActive !== false,
    source: station.source ?? "WeatherLink Davis",
    sourceCode: station.sourceCode ?? "weatherlink",
    queryMode: "DIRECT_QUERY"
  };
}

function isoDays(from: string, to: string) {
  const days: string[] = [];
  for (let day = from; day <= to; day = addIsoDays(day, 1)) days.push(day);
  return days;
}

function addIsoDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function isIsoDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function zonedDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function values(readings: NormalizedWeatherLinkReading[], variable: string) {
  return readings.filter((item) => item.variable === variable).map((item) => item.value);
}

function minimum(items: number[]) {
  return items.length ? Math.min(...items) : null;
}

function maximum(items: number[]) {
  return items.length ? Math.max(...items) : null;
}

function average(items: number[]) {
  return items.length
    ? round(items.reduce((total, value) => total + value, 0) / items.length)
    : null;
}

function sumOrNull(items: number[]) {
  return items.length ? round(items.reduce((total, value) => total + value, 0)) : null;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function finite(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}
