"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { AdminMap, type AdminMapPoint } from "../../../shared/components/admin-map";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { climaService, type ClimatePoint, type ClimateSource } from "../services/clima.service";

export type ClimateSection = "resumen" | "mapa" | "pronostico" | "historial" | "estaciones" | "alertas" | "fuentes";

const titles: Record<ClimateSection, [string, string]> = {
  resumen: ["Resumen climático", "Condiciones territoriales, alertas y disponibilidad de fuentes."],
  mapa: ["Mapa agroclimático", "Puntos climáticos y estaciones; no muestra parcelas."],
  pronostico: ["Pronóstico", "Variables pronosticadas para los próximos siete días."],
  historial: ["Historial climático", "Seleccione un punto para consultar sus lecturas almacenadas."],
  estaciones: ["Estaciones meteorológicas", "Inventario y conectividad de estaciones virtuales, oficiales o propias."],
  alertas: ["Alertas climáticas", "Eventos meteorológicos generales; no incluyen recomendaciones agrícolas."],
  fuentes: ["Estado de fuentes de datos", "Disponibilidad, última consulta y trazabilidad de proveedores."]
};

export function ClimaScreen({ section }: { section: ClimateSection }) {
  const { session } = useAuthSession();
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = section === "resumen" ? climaService.getSummary : section === "mapa" ? climaService.getMap : section === "pronostico" ? climaService.getForecast : section === "estaciones" ? climaService.getStations : section === "alertas" ? climaService.getAlerts : section === "fuentes" ? climaService.getSources : climaService.getPoints;
    void load(session).then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudo cargar el módulo climático."));
  }, [section, session]);

  const [title, description] = titles[section];
  if (error) return <ErrorState description={error} />;
  if (!data) return <LoadingState description="Cargando información climática territorial." />;

  return <section className="panel-grid"><article className="panel climate-screen"><ToolbarActions eyebrow="Clima" title={title} description={description}/>{section === "mapa" ? <ClimateMap points={data as ClimatePoint[]}/> : <ClimateContent section={section} data={data}/>}</article></section>;
}

function ClimateMap({ points }: { points: ClimatePoint[] }) {
  const mapPoints: AdminMapPoint[] = points.map((point) => ({ id: point.id, geometry: { type: "Point", coordinates: [point.longitude, point.latitude] }, color: "#1d7a9b", radius: 8, popup: { title: point.name, description: `${point.district}, ${point.department}` } }));
  return <><div className="climate-map-caption"><strong>{points.length}</strong> puntos territoriales disponibles. Seleccione un punto para revisar su ubicación.</div><AdminMap points={mapPoints} emptyMessage="No hay puntos climáticos configurados."/></>;
}

function ClimateContent({ section, data }: { section: ClimateSection; data: unknown }) {
  if (section === "resumen") return <SummaryView summary={data as Summary}/>;
  if (section === "pronostico") return <ForecastView forecasts={data as ForecastPoint[]}/>;
  if (section === "historial") return <PointsView points={data as ClimatePoint[]}/>;
  if (section === "estaciones") return <StationsView items={data as Array<Record<string, unknown>>}/>;
  if (section === "alertas") return <AlertsView items={data as AlertItem[]}/>;
  return <SourcesView items={data as ClimateSource[]}/>;
}

type Summary = { points: ClimatePoint[]; alerts: AlertItem[]; sources: ClimateSource[] };
type AlertItem = { publicId: string; pointName: string; severity: string; variable: string; value: number; unit: string; startsAt: string; status?: string };
type ForecastDay = { variable: string; value: number; unit: string; validAt: string };
type ForecastPoint = ClimatePoint & { days: ForecastDay[] };

function SummaryView({ summary }: { summary: Summary }) {
  return <div className="climate-stack"><div className="climate-kpi-grid">{summary.points.map((point) => <article className="climate-kpi" key={point.id}><span>{point.name}</span><strong>{formatReading(point.current, "temperature_2m")}</strong><small>Temperatura actual · {point.district}</small><div className="climate-kpi__meta"><span>HR {formatReading(point.current, "relative_humidity_2m")}</span><span>Viento {formatReading(point.current, "wind_speed_10m")}</span></div></article>)}</div><section className="climate-split"><ClimateTable title="Alertas activas" empty="No hay alertas climáticas activas." headers={["Zona", "Condición", "Valor", "Severidad", "Inicio"]} rows={summary.alerts.map((item) => [item.pointName, labelVariable(item.variable), `${item.value} ${item.unit}`, <Severity key="severity" value={item.severity}/>, formatDate(item.startsAt)])}/><SourcesView items={summary.sources} compact/></section></div>;
}

function ForecastView({ forecasts }: { forecasts: ForecastPoint[] }) {
  const [selectedId, setSelectedId] = useState(forecasts[0]?.id ?? "");
  const point = forecasts.find((item) => item.id === selectedId) ?? forecasts[0];
  const chartData = useMemo(() => groupForecast(point?.days ?? []), [point]);
  if (!point) return <Empty message="No hay pronósticos disponibles todavía."/>;
  return <div className="climate-stack"><label className="field-group climate-selector"><span>Punto climático</span><select value={point.id} onChange={(event) => setSelectedId(event.target.value)}>{forecasts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.district}</option>)}</select></label><section className="climate-chart-card"><div><p className="eyebrow">Pronosticado</p><h3 className="title title--section">Temperatura máxima y mínima</h3></div><ResponsiveContainer height={280} width="100%"><LineChart data={chartData}><XAxis dataKey="date"/><YAxis unit="°C"/><Tooltip/><Line dataKey="max" stroke="#1e40af" strokeWidth={2} type="monotone" name="Máxima"/><Line dataKey="min" stroke="#d97706" strokeDasharray="5 4" strokeWidth={2} type="monotone" name="Mínima"/></LineChart></ResponsiveContainer></section><ClimateTable title="Detalle diario" headers={["Fecha", "Mín.", "Máx.", "Lluvia", "Prob.", "ET₀", "Viento"]} rows={chartData.map((row) => [row.date, formatUnit(row.min,"°C"), formatUnit(row.max,"°C"), formatUnit(row.rain,"mm"), formatUnit(row.probability,"%"), formatUnit(row.et0,"mm"), formatUnit(row.wind,"km/h")])}/></div>;
}

function PointsView({ points }: { points: ClimatePoint[] }) { return <div className="climate-kpi-grid">{points.map((point) => <article className="climate-kpi" key={point.id}><span>{point.name}</span><strong>{point.department}</strong><small>{point.district}</small><div className="climate-kpi__meta"><span>Lat. {point.latitude.toFixed(3)}</span><span>Long. {point.longitude.toFixed(3)}</span></div></article>)}</div>; }
function StationsView({ items }: { items: Array<Record<string, unknown>> }) { return <ClimateTable title="Estaciones registradas" empty="No hay estaciones registradas." headers={["Nombre", "Código", "Tipo", "Estado", "Última comunicación"]} rows={items.map((item) => [String(item.nombre ?? "—"), String(item.codigo ?? "—"), String(item.tipo ?? "—"), <Status key="status" value={String(item.estado ?? "SIN CONFIGURAR")}/>, formatDate(String(item.lastCommunicationAt ?? ""))])}/>; }
function AlertsView({ items }: { items: AlertItem[] }) { return <ClimateTable title="Eventos detectados" empty="No hay alertas registradas." headers={["Zona", "Variable", "Valor", "Severidad", "Estado", "Inicio"]} rows={items.map((item) => [item.pointName, labelVariable(item.variable), `${item.value} ${item.unit}`, <Severity key="severity" value={item.severity}/>, <Status key="status" value={item.status ?? "ACTIVA"}/>, formatDate(item.startsAt)])}/>; }
function SourcesView({
  items,
  compact = false
}: {
  items: ClimateSource[];
  compact?: boolean;
}) {
  const rows = items.map((item) => [
    item.nombre,
    item.tipo,
    <Status key={`${item.codigo}-status`} value={item.estado} />,
    formatDate(item.lastSuccessAt ?? ""),
    item.lastError ?? "Sin incidentes"
  ]);

  return (
    <ClimateTable
      empty="No hay fuentes configuradas."
      headers={["Fuente", "Tipo", "Estado", "Última consulta", "Detalle"]}
      rows={rows}
      title={compact ? "Fuentes" : "Salud de las fuentes"}
    />
  );
}

function ClimateTable({ title, headers, rows, empty }: { title: string; headers: string[]; rows: ReactNode[][]; empty?: string }) { return <section className="climate-table-card"><div className="climate-table-card__header"><h3 className="title title--section">{title}</h3><span>{rows.length} registros</span></div>{rows.length === 0 ? <Empty message={empty ?? "No hay datos disponibles."} /> : <div className="data-table__wrapper"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>; }
function Severity({ value }: { value: string }) { return <span className={`climate-badge climate-badge--${value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>{value}</span>; }
function Status({ value }: { value: string }) { return <span className={`climate-badge climate-badge--${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>; }
function Empty({ message }: { message: string }) { return <p className="climate-empty">{message}</p>; }
function formatReading(values: ClimatePoint["current"], variable: string) { const match = values?.find((value) => value.variable === variable); return match ? `${Number(match.value).toFixed(1)} ${match.unit}` : "Sin dato"; }
function formatUnit(value: number | undefined, unit: string) { return value === undefined ? "—" : `${Number(value).toFixed(1)} ${unit}`; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Sin registro" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function labelVariable(variable: string) { return ({ temperature_2m_max: "Temperatura máxima", temperature_2m_min: "Temperatura mínima", precipitation_sum: "Precipitación", precipitation_probability_max: "Probabilidad de lluvia", et0_fao_evapotranspiration: "Evapotranspiración", wind_speed_10m_max: "Viento máximo" } as Record<string,string>)[variable] ?? variable.replaceAll("_", " "); }
function groupForecast(days: ForecastDay[]) { const groups = new Map<string, Record<string, number | string>>(); for (const day of days) { const date = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(day.validAt)); const row = groups.get(date) ?? { date }; row[forecastKey(day.variable)] = day.value; groups.set(date, row); } return [...groups.values()] as Array<{ date: string; min?: number; max?: number; rain?: number; probability?: number; et0?: number; wind?: number }>; }
function forecastKey(variable: string) { return ({ temperature_2m_max: "max", temperature_2m_min: "min", precipitation_sum: "rain", precipitation_probability_max: "probability", et0_fao_evapotranspiration: "et0", wind_speed_10m_max: "wind" } as Record<string,string>)[variable] ?? variable; }
