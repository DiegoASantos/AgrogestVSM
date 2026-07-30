"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CloudRain, Droplets, Gauge, Sun, Thermometer, Wind } from "lucide-react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { AdminMap, type AdminMapPoint } from "../../../shared/components/admin-map";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { climaService, type ClimateForecast, type ClimatePoint, type ClimateReading, type ClimateSource } from "../services/clima.service";

export type ClimateSection = "resumen" | "mapa" | "pronostico" | "historial" | "estaciones" | "alertas" | "fuentes";
type AlertItem = { publicId: string; pointName: string; severity: string; variable: string; value: number; unit: string; startsAt: string; status?: string };
type Summary = { points: ClimatePoint[]; alerts: AlertItem[]; sources: ClimateSource[] };

const titles: Record<ClimateSection, [string, string]> = {
  resumen: ["Resumen climatico", "Condiciones territoriales agrupadas por variable."],
  mapa: ["Mapa agroclimatico", "Puntos climaticos territoriales; no muestra parcelas."],
  pronostico: ["Pronostico", "Tendencia diaria por variable y punto territorial."],
  historial: ["Historial climatico", "Lecturas persistidas, con tipo y fecha de cada dato."],
  estaciones: ["Estaciones meteorologicas", "Inventario de estaciones configuradas."],
  alertas: ["Alertas climaticas", "Eventos meteorologicos generales, no diagnosticos agronomicos."],
  fuentes: ["Estado de fuentes de datos", "Disponibilidad y trazabilidad de proveedores."]
};

export function ClimaScreen({ section }: { section: ClimateSection }) {
  const { session } = useAuthSession();
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!session) return;
    setData(null); setError(null);
    const load = section === "resumen" ? climaService.getSummary : section === "mapa" ? climaService.getMap : section === "pronostico" ? climaService.getForecast : section === "estaciones" ? climaService.getStations : section === "alertas" ? climaService.getAlerts : section === "fuentes" ? climaService.getSources : climaService.getPoints;
    void load(session).then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudo cargar el modulo climatico."));
  }, [section, session]);
  const [title, description] = titles[section];
  if (error) return <ErrorState description={error} />;
  if (!data || !session) return <LoadingState description="Cargando informacion climatica territorial." />;
  return <section className="panel-grid"><article className="panel climate-screen"><ToolbarActions eyebrow="Clima" title={title} description={description}/><ClimateNotice/>{section === "mapa" ? <ClimateMap points={data as ClimatePoint[]}/> : <ClimateContent section={section} data={data} session={session}/>}</article></section>;
}

function ClimateContent({ section, data, session }: { section: ClimateSection; data: unknown; session: NonNullable<ReturnType<typeof useAuthSession>["session"]> }) {
  if (section === "resumen") return <SummaryView summary={data as Summary}/>;
  if (section === "pronostico") return <ForecastView forecasts={data as ClimateForecast[]}/>;
  if (section === "historial") return <HistoryView points={data as ClimatePoint[]} session={session}/>;
  if (section === "estaciones") return <StationsView items={data as Array<Record<string, unknown>>}/>;
  if (section === "alertas") return <AlertsView items={data as AlertItem[]}/>;
  return <SourcesView items={data as ClimateSource[]}/>;
}

function ClimateNotice() { return <aside className="climate-notice" role="note"><strong>Dato territorial estimado.</strong> Los modelos, reanalisis y satelites representan cuadrillas geograficas; no son mediciones exactas de campo.</aside>; }
function ClimateMap({ points }: { points: ClimatePoint[] }) { const mapPoints: AdminMapPoint[] = points.map((point) => ({ id: point.id, geometry: { type: "Point", coordinates: [point.longitude, point.latitude] }, color: "#1d7a9b", radius: 8, popup: { title: point.name, description: `${point.district}, ${point.department}` } })); return <><div className="climate-map-caption"><strong>{points.length}</strong> puntos territoriales disponibles.</div><AdminMap points={mapPoints} emptyMessage="No hay puntos climaticos configurados."/></>; }

function SummaryView({ summary }: { summary: Summary }) {
  return <div className="climate-stack"><section className="climate-summary-hero"><div><p className="eyebrow">Lectura territorial</p><h3 className="title title--section">Condiciones actuales estimadas</h3><span>Seleccione una zona para profundizar en Pronostico o Historial.</span></div><div className="climate-summary-hero__legend"><Badge value="ESTIMADO"/><span>Modelo geografico</span></div></section>{summary.points.map((point) => <section className="climate-data-section" key={point.id}><header><div><p className="eyebrow">Open-Meteo · estimado</p><h3 className="title title--section">{point.name} <small>{point.district}</small></h3></div><span className="climate-badge">Actualizado {latestDate(point.current)}</span></header><SummaryMetrics readings={point.current ?? []}/><ReadingGroups readings={point.current ?? []}/></section>)}<section className="climate-split"><ClimateTable title="Alertas activas" empty="No hay alertas climaticas activas." headers={["Zona", "Condicion", "Valor", "Severidad", "Inicio"]} rows={summary.alerts.map((item) => [item.pointName, label(item.variable), `${item.value} ${item.unit}`, <Badge key="severity" value={item.severity}/>, date(item.startsAt)])}/><SourcesView items={summary.sources} compact/></section></div>;
}

function SummaryMetrics({ readings }: { readings: ClimateReading[] }) { const cards = [[Thermometer, "Temperatura", "temperature_2m"], [Droplets, "Humedad", "relative_humidity_2m"], [CloudRain, "Lluvia", "precipitation"], [Wind, "Viento", "wind_speed_10m"], [Sun, "Radiacion", "shortwave_radiation"], [Gauge, "VPD", "vapour_pressure_deficit"]] as const; return <div className="climate-metric-grid">{cards.map(([Icon, title, variable]) => { const reading = readings.find((item) => item.variable === variable); return <article key={variable}><Icon aria-hidden="true" size={20}/><span>{title}</span><strong>{reading ? `${formatValue(reading.value)} ${reading.unit}` : "Sin dato"}</strong></article>; })}</div>; }

function ForecastView({ forecasts }: { forecasts: ClimateForecast[] }) {
  const [selectedId, setSelectedId] = useState(forecasts[0]?.id ?? ""); const point = forecasts.find((item) => item.id === selectedId) ?? forecasts[0];
  if (!point) return <Empty message="No hay pronosticos disponibles todavia."/>;
  return <div className="climate-stack"><PointSelector points={forecasts} value={point.id} onChange={setSelectedId}/><div className="climate-chart-grid"><ForecastChart title="Temperatura" caption="Evolucion diaria" days={point.days} variables={["temperature_2m_max", "temperature_2m_min"]} kind="line"/><ForecastChart title="Agua y demanda hidrica" caption="Acumulados, probabilidad y ET" days={point.days} variables={["precipitation_sum", "precipitation_probability_max", "et0_fao_evapotranspiration"]} kind="bar"/><ForecastChart title="Atmosfera" caption="Viento, rafagas, radiacion e insolacion" days={point.days} variables={["wind_speed_10m_max", "wind_gusts_10m_max", "shortwave_radiation_sum", "sunshine_duration"]} kind="area"/></div></div>;
}

function ForecastChart({ title, caption, days, variables, kind }: { title: string; caption: string; days: ClimateForecast["days"]; variables: string[]; kind: "line" | "bar" | "area" }) {
  const available = variables.filter((variable) => days.some((day) => day.variable === variable)); const [selected, setSelected] = useState(available[0] ?? variables[0]);
  useEffect(() => { if (available.length && !available.includes(selected)) setSelected(available[0]); }, [available.join(","), selected]);
  const rows = useMemo(() => days.filter((day) => day.variable === selected).map((day) => ({ date: dateOnly(day.validAt), value: Number(day.value) })).filter((day) => Number.isFinite(day.value)), [days, selected]);
  const unit = days.find((day) => day.variable === selected)?.unit ?? "";
  const Chart = kind === "line" ? LineChart : kind === "bar" ? BarChart : AreaChart;
  return <section className="climate-chart-card"><header className="climate-chart-card__header"><div><p className="eyebrow">Pronosticado</p><h3 className="title title--section">{title}</h3><small>{caption}</small></div><label className="field-group"><span className="sr-only">Variable de {title}</span><select value={selected} onChange={(event) => setSelected(event.target.value)}>{available.map((variable) => <option value={variable} key={variable}>{label(variable)}</option>)}</select></label></header>{rows.length === 0 ? <Empty message="La fuente aun no entrega esta variable."/> : <ResponsiveContainer height={255} width="100%"><Chart data={rows}><XAxis dataKey="date"/><YAxis unit={` ${unit}`}/><Tooltip formatter={(value) => [`${formatValue(String(value))} ${unit}`, label(selected)]}/>{kind === "line" ? <Line dataKey="value" stroke="#0284c7" strokeWidth={2.5} type="monotone" dot={{ r: 3 }}/>: kind === "bar" ? <Bar dataKey="value" fill="#0f766e" radius={[5, 5, 0, 0]}/>: <Area dataKey="value" stroke="#d97706" fill="#fef3c7" strokeWidth={2.5} type="monotone"/>}</Chart></ResponsiveContainer>}</section>;
}

function HistoryView({ points, session }: { points: ClimatePoint[]; session: NonNullable<ReturnType<typeof useAuthSession>["session"]> }) {
  const [selectedId, setSelectedId] = useState(points[0]?.id ?? ""); const [history, setHistory] = useState<{ point: ClimatePoint; rows: ClimateReading[] } | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!selectedId) return; void climaService.getHistory(session, selectedId).then(setHistory).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudo cargar el historial.")); }, [selectedId, session]);
  if (error) return <ErrorState description={error}/>;
  return <div className="climate-stack"><PointSelector points={points} value={selectedId} onChange={setSelectedId}/>{!history ? <LoadingState description="Cargando lecturas persistidas."/> : <><ReadingGroups readings={history.rows}/><ClimateTable title="Trazabilidad de lecturas" empty="Aun no hay lecturas historicas persistidas." headers={["Variable", "Valor", "Tipo", "Fecha del dato", "Modelo"]} rows={history.rows.map((row) => [label(row.variable), `${row.value} ${row.unit}`, <Badge key="type" value={row.type}/>, date(row.dataAt), row.model ?? "No informado"])} /></>}</div>;
}

function PointSelector({ points, value, onChange }: { points: ClimatePoint[]; value: string; onChange: (value: string) => void }) { return <label className="field-group climate-selector"><span>Punto climatico</span><select value={value} onChange={(event) => onChange(event.target.value)}>{points.map((point) => <option key={point.id} value={point.id}>{point.name} - {point.district}</option>)}</select></label>; }
function ReadingGroups({ readings }: { readings: ClimateReading[] }) { const groups = groupReadings(readings); return <div className="climate-reading-groups">{groups.map(([title, values]) => <section className="climate-reading-group" key={title}><h4>{title}</h4>{values.length === 0 ? <span className="climate-empty">Sin dato disponible.</span> : values.map((item) => <div key={item.variable}><span>{label(item.variable)}</span><strong>{formatValue(item.value)} {item.unit}</strong><small>{item.type} - {date(item.dataAt)}</small></div>)}</section>)}</div>; }
function StationsView({ items }: { items: Array<Record<string, unknown>> }) { return <ClimateTable title="Estaciones registradas" empty="No hay estaciones registradas." headers={["Nombre", "Codigo", "Tipo", "Estado", "Ultima comunicacion"]} rows={items.map((item) => [String(item.nombre ?? "-"), String(item.codigo ?? "-"), String(item.tipo ?? "-"), <Badge key="status" value={String(item.estado ?? "SIN CONFIGURAR")}/>, date(String(item.lastCommunicationAt ?? ""))])}/>; }
function AlertsView({ items }: { items: AlertItem[] }) { return <ClimateTable title="Eventos detectados" empty="No hay alertas registradas." headers={["Zona", "Variable", "Valor", "Severidad", "Estado", "Inicio"]} rows={items.map((item) => [item.pointName, label(item.variable), `${item.value} ${item.unit}`, <Badge key="severity" value={item.severity}/>, <Badge key="status" value={item.status ?? "ACTIVA"}/>, date(item.startsAt)])}/>; }
function SourcesView({ items, compact = false }: { items: ClimateSource[]; compact?: boolean }) { return <ClimateTable title={compact ? "Fuentes" : "Salud de las fuentes"} empty="No hay fuentes configuradas." headers={["Fuente", "Tipo", "Estado", "Ultima consulta", "Detalle"]} rows={items.map((item) => [item.nombre, item.tipo, <Badge key={item.codigo} value={item.estado}/>, date(item.lastSuccessAt ?? ""), item.lastError ?? "Sin incidentes"])} />; }
function ClimateTable({ title, headers, rows, empty }: { title: string; headers: string[]; rows: ReactNode[][]; empty?: string }) { return <section className="climate-table-card"><div className="climate-table-card__header"><h3 className="title title--section">{title}</h3><span>{rows.length} registros</span></div>{rows.length === 0 ? <Empty message={empty ?? "No hay datos disponibles."}/> : <div className="data-table__wrapper"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>; }
function Badge({ value }: { value: string }) { return <span className={`climate-badge climate-badge--${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>; }
function Empty({ message }: { message: string }) { return <p className="climate-empty">{message}</p>; }
function date(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "Sin registro" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(parsed); }
function dateOnly(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(parsed); }
function latestDate(readings: ClimateReading[] | undefined) { const value = readings?.[0]?.dataAt; return value ? date(value) : "sin registro"; }
function formatValue(value: number | string) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric.toFixed(1) : "Sin dato"; }
function label(variable: string) { return ({ temperature_2m: "Temperatura", apparent_temperature: "Temperatura aparente", dew_point_2m: "Punto de rocio", temperature_2m_max: "Temperatura maxima", temperature_2m_min: "Temperatura minima", relative_humidity_2m: "Humedad relativa", vapour_pressure_deficit: "VPD", precipitation: "Precipitacion", precipitation_sum: "Precipitacion acumulada", precipitation_probability_max: "Probabilidad de lluvia", wind_speed_10m: "Viento a 10 m", wind_speed_10m_max: "Viento maximo", wind_direction_10m: "Direccion del viento", wind_gusts_10m: "Rafagas", wind_gusts_10m_max: "Rafagas maximas", shortwave_radiation: "Radiacion solar", shortwave_radiation_sum: "Radiacion acumulada", sunshine_duration: "Horas de sol", cloud_cover: "Nubosidad", surface_pressure: "Presion superficial", et0_fao_evapotranspiration: "ET de referencia", soil_temperature_0cm: "Temperatura de suelo regional", soil_moisture_0_to_1cm: "Humedad de suelo regional" } as Record<string, string>)[variable] ?? variable.replaceAll("_", " "); }
function groupReadings(readings: ClimateReading[]) { const variables: Array<[string, string[]]> = [["Temperatura", ["temperature_2m", "apparent_temperature", "dew_point_2m", "soil_temperature_0cm"]], ["Humedad y VPD", ["relative_humidity_2m", "vapour_pressure_deficit", "soil_moisture_0_to_1cm"]], ["Precipitacion", ["precipitation"]], ["Viento", ["wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"]], ["Radiacion y nubosidad", ["shortwave_radiation", "cloud_cover", "surface_pressure"]]]; return variables.map(([title, names]) => [title, readings.filter((reading) => names.includes(reading.variable))] as [string, ClimateReading[]]); }
