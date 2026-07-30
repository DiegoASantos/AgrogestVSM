import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";

type Punto = { id: string; public_id: string; nombre: string; departamento: string; distrito: string; latitud: string; longitud: string };
const CURRENT_FIELDS: Array<[string, string]> = [
  ["temperature_2m", "°C"], ["relative_humidity_2m", "%"], ["apparent_temperature", "°C"], ["dew_point_2m", "°C"], ["vapour_pressure_deficit", "kPa"],
  ["precipitation", "mm"], ["wind_speed_10m", "km/h"], ["wind_direction_10m", "°"], ["wind_gusts_10m", "km/h"], ["shortwave_radiation", "W/m2"],
  ["cloud_cover", "%"], ["surface_pressure", "hPa"], ["soil_temperature_0cm", "°C"], ["soil_moisture_0_to_1cm", "m3/m3"]
];
const DAILY_FIELDS: Array<[string, string]> = [
  ["temperature_2m_max", "°C"], ["temperature_2m_min", "°C"], ["precipitation_sum", "mm"], ["precipitation_probability_max", "%"],
  ["et0_fao_evapotranspiration", "mm"], ["wind_speed_10m_max", "km/h"], ["wind_gusts_10m_max", "km/h"], ["shortwave_radiation_sum", "MJ/m2"], ["sunshine_duration", "h"]
];

@Injectable()
export class ClimaService {
  private syncing = false;
  constructor(private readonly dataSource: DataSource) {}

  async summary() {
    await this.syncCurrentIfNeeded();
    const points = await this.points();
    const conditions = await Promise.all(points.map(async (point) => ({ ...toPoint(point), current: await this.latest(point.id) })));
    const alerts = await this.dataSource.query("SELECT a.public_id AS \"publicId\", p.nombre AS \"pointName\", a.severidad AS severity, a.variable AS variable, a.valor AS value, a.unidad AS unit, a.inicio_at AS \"startsAt\" FROM clima.alertas a JOIN clima.puntos_climaticos p ON p.id=a.punto_climatico_id WHERE a.estado='ACTIVA' ORDER BY a.severidad DESC,a.inicio_at DESC LIMIT 20");
    return createSuccessResponse({ points: conditions, alerts, sources: await this.sources() });
  }

  async forecast(pointId?: string) {
    await this.syncCurrentIfNeeded();
    const points = pointId ? [await this.point(pointId)] : await this.points();
    const result = await Promise.all(points.map(async (point) => ({ ...toPoint(point), days: (await this.dataSource.query("SELECT variable, valor AS value, unidad AS unit, valido_at AS \"validAt\", emitido_at AS \"issuedAt\" FROM clima.pronosticos WHERE punto_climatico_id=$1 ORDER BY valido_at,variable", [point.id])).map(normalizeSunshine) })));
    return createSuccessResponse(result);
  }

  async history(pointId: string, start?: string, end?: string) {
    const point = await this.point(pointId);
    const rows = (await this.dataSource.query("SELECT variable, valor AS value, unidad AS unit, tipo AS type, dato_at AS \"dataAt\", recibido_at AS \"receivedAt\", modelo AS model FROM clima.lecturas WHERE punto_climatico_id=$1 AND dato_at >= COALESCE($2::timestamptz, now()-interval '30 days') AND dato_at <= COALESCE($3::timestamptz, now()) ORDER BY dato_at ASC", [point.id, start ?? null, end ?? null])).map(normalizeSunshine);
    return createSuccessResponse({ point: toPoint(point), rows });
  }

  async map() { await this.syncCurrentIfNeeded(); const points = await this.points(); return createSuccessResponse(await Promise.all(points.map(async (point) => ({ ...toPoint(point), current: await this.latest(point.id) })))); }
  async stations() { return createSuccessResponse(await this.dataSource.query("SELECT public_id AS \"publicId\", nombre, codigo, tipo, latitud, longitud, estado, variables_json AS variables, ultima_comunicacion_at AS \"lastCommunicationAt\", activo AS \"isActive\" FROM clima.estaciones_meteorologicas ORDER BY nombre")); }
  async alerts() { return createSuccessResponse(await this.dataSource.query("SELECT a.public_id AS \"publicId\", p.public_id AS \"pointId\", p.nombre AS \"pointName\", a.severidad AS severity, a.estado AS status, a.variable, a.valor AS value, a.unidad AS unit, a.inicio_at AS \"startsAt\", a.fin_at AS \"endsAt\" FROM clima.alertas a JOIN clima.puntos_climaticos p ON p.id=a.punto_climatico_id ORDER BY a.inicio_at DESC")); }
  async sources() { return this.dataSource.query("SELECT codigo, nombre, tipo, estado, ultima_consulta_exitosa_at AS \"lastSuccessAt\", ultimo_error AS \"lastError\", respuesta_promedio_ms AS \"averageResponseMs\", activo AS \"isActive\" FROM clima.fuentes_datos ORDER BY nombre"); }
  async pointsResponse() { return createSuccessResponse((await this.points()).map(toPoint)); }

  async syncCurrentIfNeeded() {
    if (this.syncing) return;
    const latest = await this.dataSource.query("SELECT max(ultima_consulta_exitosa_at) AS latest FROM clima.fuentes_datos WHERE codigo='open_meteo'");
    if (latest[0]?.latest && Date.now() - new Date(latest[0].latest).getTime() < 55 * 60_000) return;
    await this.syncOpenMeteo();
  }

  async syncOpenMeteo() {
    if (this.syncing) return;
    this.syncing = true;
    const started = Date.now();
    try {
      const [source] = await this.dataSource.query("SELECT id FROM clima.fuentes_datos WHERE codigo='open_meteo'");
      const points = await this.points();
      for (const point of points) await this.fetchPoint(source.id, point);
      await this.dataSource.query("UPDATE clima.fuentes_datos SET estado='OPERATIVA',ultima_consulta_exitosa_at=now(),ultimo_error=NULL,respuesta_promedio_ms=$1,actualizado_at=now() WHERE codigo='open_meteo'", [Date.now() - started]);
    } catch (error) {
      await this.dataSource.query("UPDATE clima.fuentes_datos SET estado='DEGRADADA',ultimo_error=$1,actualizado_at=now() WHERE codigo='open_meteo'", [error instanceof Error ? error.message.slice(0, 500) : "Fallo de sincronizacion"]);
    } finally { this.syncing = false; }
  }

  private async fetchPoint(sourceId: string, point: Punto) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude: point.latitud, longitude: point.longitud, timezone: "America/Lima", forecast_days: "7", current: CURRENT_FIELDS.map(([variable]) => variable).join(","), daily: DAILY_FIELDS.map(([variable]) => variable).join(",") }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    const payload = await response.json() as { current?: Record<string, unknown>; daily?: Record<string, unknown> };
    const current = payload.current ?? {}; const daily = payload.daily ?? {}; const time = String(current.time ?? new Date().toISOString());
    for (const [variable, unit] of CURRENT_FIELDS) { const value = numeric(current[variable]); if (value !== null) await this.insertReading(sourceId, point.id, variable, value, unit, "ESTIMADO", time); }
    const dates = Array.isArray(daily.time) ? daily.time : [];
    for (let index = 0; index < dates.length; index += 1) for (const [variable, unit] of DAILY_FIELDS) { const values = daily[variable]; const raw = Array.isArray(values) ? numeric(values[index]) : null; const value = variable === "sunshine_duration" && raw !== null ? Math.round((raw / 3600) * 100) / 100 : raw; if (value !== null) { const validAt = `${dates[index]}T12:00:00-05:00`; await this.dataSource.query("INSERT INTO clima.pronosticos(fuente_id,punto_climatico_id,variable,valor,unidad,valido_at,emitido_at,modelo) VALUES($1,$2,$3,$4,$5,$6,now(),'best_match') ON CONFLICT(fuente_id,punto_climatico_id,variable,valido_at,emitido_at) DO NOTHING", [sourceId, point.id, variable, value, unit, validAt]); await this.createAlerts(sourceId, point.id, variable, value, unit, validAt); } }
  }

  private insertReading(sourceId: string, pointId: string, variable: string, value: number, unit: string, type: string, at: string) { return this.dataSource.query("INSERT INTO clima.lecturas(fuente_id,punto_climatico_id,variable,valor,unidad,tipo,dato_at,modelo) VALUES($1,$2,$3,$4,$5,$6,$7,'best_match') ON CONFLICT DO NOTHING", [sourceId, pointId, variable, value, unit, type, at]); }
  private async createAlerts(sourceId: string, pointId: string, variable: string, value: number, unit: string, startsAt: string) { const rules = await this.dataSource.query("SELECT id,codigo,operador,valor_precaucion AS precaution,valor_alta AS high,valor_critica AS critical FROM clima.umbrales_alerta WHERE activo=true AND variable=$1", [variable]); for (const rule of rules) { const severity = resolveSeverity(value, rule); if (!severity) continue; await this.dataSource.query("INSERT INTO clima.alertas(umbral_id,punto_climatico_id,fuente_id,severidad,variable,valor,unidad,inicio_at,fin_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8::timestamptz + interval '24 hours') ON CONFLICT(umbral_id,punto_climatico_id,inicio_at) DO NOTHING", [rule.id, pointId, sourceId, severity, variable, value, unit, startsAt]); } }
  private async latest(pointId: string) { return this.dataSource.query("SELECT DISTINCT ON(variable) variable,valor AS value,unidad AS unit,tipo AS type,dato_at AS \"dataAt\",recibido_at AS \"receivedAt\" FROM clima.lecturas WHERE punto_climatico_id=$1 ORDER BY variable,dato_at DESC", [pointId]); }
  private async points(): Promise<Punto[]> { return this.dataSource.query("SELECT id,public_id,nombre,departamento,distrito,latitud,longitud FROM clima.puntos_climaticos WHERE activo=true ORDER BY departamento,distrito"); }
  private async point(publicId: string) { const rows = await this.dataSource.query("SELECT id,public_id,nombre,departamento,distrito,latitud,longitud FROM clima.puntos_climaticos WHERE public_id=$1 AND activo=true", [publicId]); if (!rows[0]) throw new NotFoundException("Punto climatico no encontrado."); return rows[0] as Punto; }
}
function numeric(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function normalizeSunshine<T extends { variable: string; value: number; unit: string }>(row: T): T {
  if (row.variable !== "sunshine_duration" || row.value === null || typeof row.value !== "number") return row;
  const raw = Number(row.value);
  if (!Number.isFinite(raw) || raw <= 24) return row;
  return { ...row, value: Math.round((raw / 3600) * 100) / 100, unit: "h" };
}
function resolveSeverity(value: number, rule: { operador: string; precaution: string | null; high: string | null; critical: string | null }) { const matches = (threshold: string | null) => threshold !== null && (rule.operador === ">=" ? value >= Number(threshold) : value <= Number(threshold)); if (matches(rule.critical)) return "CRITICA"; if (matches(rule.high)) return "ALTA"; if (matches(rule.precaution)) return "PRECAUCION"; return null; }
function toPoint(point: Punto) { return { id: point.public_id, name: point.nombre, department: point.departamento, district: point.distrito, latitude: Number(point.latitud), longitude: Number(point.longitud) }; }
