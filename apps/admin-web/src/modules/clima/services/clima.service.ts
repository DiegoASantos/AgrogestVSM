import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";

type SessionInput = Pick<AuthSession, "accessToken" | "tokenType">;
export type ClimateReading = { variable: string; value: number; unit: string; type: string; dataAt: string; receivedAt: string; model?: string | null };
export type ClimatePoint = { id: string; name: string; department: string; district: string; latitude: number; longitude: number; current?: ClimateReading[] };
export type ClimateSource = { codigo: string; nombre: string; tipo: string; estado: string; lastSuccessAt: string | null; lastError: string | null };
export type ClimateForecast = ClimatePoint & { days: Array<{ variable: string; value: number; unit: string; validAt: string }> };

const headers = (session: SessionInput) => ({ headers: createAuthHeaders(session.accessToken, session.tokenType) });

export const climaService = {
  getSummary(session: SessionInput) { return apiRequest<{ points: ClimatePoint[]; alerts: unknown[]; sources: ClimateSource[] }>("/clima/resumen", headers(session)); },
  getMap(session: SessionInput) { return apiRequest<ClimatePoint[]>("/clima/mapa", headers(session)); },
  getForecast(session: SessionInput, pointId?: string) { return apiRequest<ClimateForecast[]>(`/clima/pronostico${pointId ? `?punto_id=${encodeURIComponent(pointId)}` : ""}`, headers(session)); },
  getHistory(session: SessionInput, pointId: string) { return apiRequest<{ point: ClimatePoint; rows: ClimateReading[] }>(`/clima/historico?punto_id=${encodeURIComponent(pointId)}`, headers(session)); },
  getPoints(session: SessionInput) { return apiRequest<ClimatePoint[]>("/clima/puntos", headers(session)); },
  getStations(session: SessionInput) { return apiRequest<Array<Record<string, unknown>>>("/clima/estaciones", headers(session)); },
  getAlerts(session: SessionInput) { return apiRequest<Array<Record<string, unknown>>>("/clima/alertas", headers(session)); },
  getSources(session: SessionInput) { return apiRequest<ClimateSource[]>("/clima/fuentes", headers(session)); }
};
