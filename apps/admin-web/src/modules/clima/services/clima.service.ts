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
};
export type ClimatePoint = {
  id: string;
  name: string;
  department: string;
  district: string;
  latitude: number;
  longitude: number;
  current?: ClimateReading[];
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
      alerts: unknown[];
      sources: ClimateSource[];
      reservorios: Reservoir[];
    }>("/clima/resumen", headers(session));
  },
  getMap(session: SessionInput) {
    return apiRequest<ClimatePoint[]>("/clima/mapa", headers(session));
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
  getPoints(session: SessionInput) {
    return apiRequest<ClimatePoint[]>("/clima/puntos", headers(session));
  },
  getStations(session: SessionInput) {
    return apiRequest<Array<Record<string, unknown>>>(
      "/clima/estaciones",
      headers(session)
    );
  },
  getAlerts(session: SessionInput) {
    return apiRequest<Array<Record<string, unknown>>>("/clima/alertas", headers(session));
  },
  getSources(session: SessionInput) {
    return apiRequest<ClimateSource[]>("/clima/fuentes", headers(session));
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
