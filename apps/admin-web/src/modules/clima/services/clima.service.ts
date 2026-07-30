import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";

type SessionInput = Pick<AuthSession, "accessToken" | "tokenType">;
export type ClimatePoint = { id: string; name: string; department: string; district: string; latitude: number; longitude: number; current?: Array<{ variable: string; value: number; unit: string; dataAt: string }> };
export type ClimateSource = { codigo: string; nombre: string; tipo: string; estado: string; lastSuccessAt: string | null; lastError: string | null };

export const climaService = {
  getSummary(session: SessionInput) { return apiRequest<{ points: ClimatePoint[]; alerts: unknown[]; sources: ClimateSource[] }>("/clima/resumen", { headers: createAuthHeaders(session.accessToken, session.tokenType) }); },
  getMap(session: SessionInput) { return apiRequest<ClimatePoint[]>("/clima/mapa", { headers: createAuthHeaders(session.accessToken, session.tokenType) }); },
  getForecast(session: SessionInput, pointId?: string) { return apiRequest<Array<ClimatePoint & { days: Array<{ variable: string; value: number; unit: string; validAt: string }> }>>(`/clima/pronostico${pointId ? `?punto_id=${pointId}` : ""}`, { headers: createAuthHeaders(session.accessToken, session.tokenType) }); },
  getPoints(session: SessionInput) { return apiRequest<ClimatePoint[]>("/clima/puntos", { headers: createAuthHeaders(session.accessToken, session.tokenType) }); },
  getStations(session: SessionInput) { return apiRequest<Array<Record<string, unknown>>>("/clima/estaciones", { headers: createAuthHeaders(session.accessToken, session.tokenType) }); },
  getAlerts(session: SessionInput) { return apiRequest<Array<Record<string, unknown>>>("/clima/alertas", { headers: createAuthHeaders(session.accessToken, session.tokenType) }); },
  getSources(session: SessionInput) { return apiRequest<ClimateSource[]>("/clima/fuentes", { headers: createAuthHeaders(session.accessToken, session.tokenType) }); }
};
