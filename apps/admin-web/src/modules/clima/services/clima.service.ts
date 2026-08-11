import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";

type SessionInput = Pick<AuthSession, "accessToken" | "tokenType">;
export type ClimateReading = {
  variable: string;
  value: number;
  unit: string;
  type: string;
  dataAt: string;
  receivedAt: string;
  model?: string | null;
  source?: string | null;
  sourceCode?: string | null;
};
export type ClimatePoint = {
  id: string;
  name: string;
  department: string;
  district: string;
  latitude: number;
  longitude: number;
  current?: ClimateReading[];
  kind?: "point";
};
export type ClimateStation = {
  id: string;
  publicId: string;
  name: string;
  codigo: string;
  tipo: string;
  latitude: number | null;
  longitude: number | null;
  estado: string;
  variables: string[];
  lastCommunicationAt: string | null;
  isActive: boolean;
  source: string | null;
  sourceCode: string | null;
  syncStatus: string | null;
  lastCompleteDay: string | null;
  lastAttemptAt: string | null;
  syncDetail: string | null;
  kind: "station";
  current?: ClimateReading[];
};
export type WeatherLinkStatus = {
  enabled: boolean;
  running: boolean;
  syncHour: number;
  timeZone: string;
  stations: Array<{
    stationId: string;
    stationName: string;
    isActive: boolean;
    status: string | null;
    lastCompleteDay: string | null;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    detail: string | null;
  }>;
};
export type ClimateSource = {
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
  lastSuccessAt: string | null;
  lastError: string | null;
};
export type ClimateForecast = ClimatePoint & {
  days: Array<{
    variable: string;
    value: number;
    unit: string;
    validAt: string;
    issuedAt?: string;
    model?: string | null;
  }>;
};

export type Reservoir = {
  publicId: string;
  name: string;
  department: string;
  province: string;
  district: string;
  latitude: number;
  longitude: number;
  capacityMaxMmc: number | null;
  elevationMaxMasl: number | null;
  latestCota: number | null;
  latestVolumeMmc: number | null;
  latestInflowM3s: number | null;
  latestOutflowM3s: number | null;
  latestEvaporationMm: number | null;
  latestDataAt: string | null;
};

export type ReservoirReading = {
  publicId: string;
  variable: string;
  value: number;
  unit: string;
  type: string;
  dataAt: string;
  receivedAt: string;
};

const headers = (session: SessionInput) => ({
  headers: createAuthHeaders(session.accessToken, session.tokenType)
});

export const climaService = {
  getSummary(session: SessionInput) {
    return apiRequest<{
      points: ClimatePoint[];
      stations: ClimateStation[];
      alerts: unknown[];
      sources: ClimateSource[];
      reservorios: Reservoir[];
    }>("/clima/resumen", headers(session));
  },
  getMap(session: SessionInput) {
    return apiRequest<Array<ClimatePoint | ClimateStation>>(
      "/clima/mapa",
      headers(session)
    );
  },
  getForecast(session: SessionInput, pointId?: string) {
    return apiRequest<ClimateForecast[]>(
      `/clima/pronostico${pointId ? `?punto_id=${encodeURIComponent(pointId)}` : ""}`,
      headers(session)
    );
  },
  getHistory(session: SessionInput, pointId: string) {
    return apiRequest<{ point: ClimatePoint; rows: ClimateReading[] }>(
      `/clima/historico?punto_id=${encodeURIComponent(pointId)}`,
      headers(session)
    );
  },
  getStationHistory(session: SessionInput, stationId: string) {
    return apiRequest<{ station: ClimateStation; rows: ClimateReading[] }>(
      `/clima/historico?estacion_id=${encodeURIComponent(stationId)}`,
      headers(session)
    );
  },
  getPoints(session: SessionInput) {
    return apiRequest<ClimatePoint[]>("/clima/puntos", headers(session));
  },
  getStations(session: SessionInput) {
    return apiRequest<ClimateStation[]>("/clima/estaciones", headers(session));
  },
  getAlerts(session: SessionInput) {
    return apiRequest<Array<Record<string, unknown>>>("/clima/alertas", headers(session));
  },
  getSources(session: SessionInput) {
    return apiRequest<ClimateSource[]>("/clima/fuentes", headers(session));
  },
  getWeatherLinkStatus(session: SessionInput) {
    return apiRequest<WeatherLinkStatus>(
      "/clima/fuentes/weatherlink/estado",
      headers(session)
    );
  },
  forceWeatherLinkSync(session: SessionInput) {
    return apiRequest<{ started: boolean }>("/clima/fuentes/weatherlink/sincronizar", {
      ...headers(session),
      method: "POST" as const
    });
  },
  updateWeatherLinkStation(session: SessionInput, stationId: string, isActive: boolean) {
    return apiRequest<{ publicId: string; isActive: boolean }>(
      `/clima/estaciones/${encodeURIComponent(stationId)}/activo`,
      { ...headers(session), method: "PUT" as const, body: { isActive } }
    );
  },

  getReservorios(session: SessionInput) {
    return apiRequest<Reservoir[]>("/clima/reservorios", headers(session));
  },

  getReservorioHistory(
    session: SessionInput,
    id: string,
    params?: { variable?: string; desde?: string; hasta?: string }
  ) {
    const qs = new URLSearchParams();
    if (params?.variable) qs.set("variable", params.variable);
    if (params?.desde) qs.set("desde", params.desde);
    if (params?.hasta) qs.set("hasta", params.hasta);
    const query = qs.toString();
    return apiRequest<{ reservoir: Reservoir; rows: ReservoirReading[] }>(
      `/clima/reservorios/${encodeURIComponent(id)}/historico${query ? `?${query}` : ""}`,
      headers(session)
    );
  },

  createReservorioReading(
    session: SessionInput,
    id: string,
    body: {
      variable: string;
      valor: number;
      unidad: string;
      tipo?: string;
      dato_at: string;
    }
  ) {
    return apiRequest<ReservoirReading>(
      `/clima/reservorios/${encodeURIComponent(id)}/lecturas`,
      { ...headers(session), method: "POST" as const, body }
    );
  },

  updateReservorioReading(
    session: SessionInput,
    id: string,
    lecturaId: string,
    body: {
      variable?: string;
      valor?: number;
      unidad?: string;
      tipo?: string;
      dato_at?: string;
    }
  ) {
    return apiRequest<ReservoirReading>(
      `/clima/reservorios/${encodeURIComponent(id)}/lecturas/${encodeURIComponent(lecturaId)}`,
      { ...headers(session), method: "PUT" as const, body }
    );
  },

  deleteReservorioReading(session: SessionInput, id: string, lecturaId: string) {
    return apiRequest<null>(
      `/clima/reservorios/${encodeURIComponent(id)}/lecturas/${encodeURIComponent(lecturaId)}`,
      { ...headers(session), method: "DELETE" as const }
    );
  }
};
