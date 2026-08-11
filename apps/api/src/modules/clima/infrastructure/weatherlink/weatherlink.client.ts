import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";

import { appConfig } from "../../../../config/app.config";
import type {
  WeatherLinkConfig,
  WeatherLinkHistoricPayload,
  WeatherLinkStation
} from "./weatherlink.types";

export class WeatherLinkRequestError extends Error {
  constructor(
    readonly status: number | null,
    message: string
  ) {
    super(message);
  }
}

@Injectable()
export class WeatherLinkClient {
  readonly config: WeatherLinkConfig;

  constructor(@Inject(appConfig.KEY) config: ConfigType<typeof appConfig>) {
    this.config = config.weatherLink;
  }

  async stations(): Promise<WeatherLinkStation[]> {
    const payload = await this.request<{ stations?: WeatherLinkStation[] }>("stations");
    return Array.isArray(payload.stations) ? payload.stations : [];
  }

  async historic(
    stationId: string,
    startTimestamp: number,
    endTimestamp: number
  ): Promise<WeatherLinkHistoricPayload> {
    const payload = await this.request<unknown>(
      `historic/${encodeURIComponent(stationId)}`,
      {
        "start-timestamp": String(startTimestamp),
        "end-timestamp": String(endTimestamp)
      }
    );
    return validateHistoricPayload(payload);
  }

  private async request<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const url = new URL(`https://api.weatherlink.com/v2/${path}`);
    url.search = new URLSearchParams({
      "api-key": this.config.apiKey,
      ...query
    }).toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "X-Api-Secret": this.config.apiSecret },
        signal: AbortSignal.timeout(this.config.requestTimeoutMs)
      });
    } catch {
      throw new WeatherLinkRequestError(null, "WeatherLink no disponible.");
    }

    if (!response.ok) {
      throw new WeatherLinkRequestError(
        response.status,
        response.status === 429
          ? "WeatherLink limito temporalmente las consultas."
          : `WeatherLink respondio con estado ${response.status}.`
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new WeatherLinkRequestError(
        null,
        "WeatherLink devolvio una respuesta invalida."
      );
    }
  }
}

export function validateHistoricPayload(payload: unknown): WeatherLinkHistoricPayload {
  if (!isRecord(payload) || !Array.isArray(payload.sensors)) {
    throw new WeatherLinkRequestError(
      null,
      "WeatherLink devolvio datos historicos incompletos."
    );
  }
  for (const sensor of payload.sensors) {
    if (!isRecord(sensor) || !Array.isArray(sensor.data)) {
      throw new WeatherLinkRequestError(
        null,
        "WeatherLink devolvio datos historicos incompletos."
      );
    }
    for (const record of sensor.data) {
      if (!isRecord(record) || !isFiniteNumber(record.ts)) {
        throw new WeatherLinkRequestError(
          null,
          "WeatherLink devolvio datos historicos incompletos."
        );
      }
    }
  }
  return payload as WeatherLinkHistoricPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
