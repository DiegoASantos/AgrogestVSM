"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CloudRain, Droplets, Gauge, Sun, Thermometer, ThermometerSnowflake, ThermometerSun, Wind } from "lucide-react";

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
  return <section className="panel-grid"><article className="panel climate-screen"><ToolbarActions eyebrow="Clima" title={title} description={description}/><ClimateNotice/>{section === "mapa" ? <ClimateMap points={data as ClimatePoint[]} session={session}/> : <ClimateContent section={section} data={data} session={session}/>}</article></section>;
}

function ClimateContent({ section, data, session }: { section: ClimateSection; data: unknown; session: NonNullable<ReturnType<typeof useAuthSession>["session"]> }) {
  if (section === "resumen") return <SummaryView summary={data as Summary} session={session}/>;
  if (section === "pronostico") return <ForecastView forecasts={data as ClimateForecast[]}/>;
  if (section === "historial") return <HistoryView points={data as ClimatePoint[]} session={session}/>;
  if (section === "estaciones") return <StationsView items={data as Array<Record<string, unknown>>}/>;
  if (section === "alertas") return <AlertsView items={data as AlertItem[]}/>;
  return <SourcesView items={data as ClimateSource[]}/>;
}

function ClimateNotice() { return <aside className="climate-notice" role="note"><strong>Dato territorial estimado.</strong> Los modelos, reanalisis y satelites representan cuadrillas geograficas; no son mediciones exactas de campo.</aside>; }
function ClimateMap({ points, session }: { points: ClimatePoint[]; session: NonNullable<ReturnType<typeof useAuthSession>["session"]> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ClimateForecast[] | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const selected = points.find((p) => p.id === selectedId);
  const handleSelect = async (pointId: string) => {
    setSelectedId(pointId); setLoadingForecast(true);
    try { setForecast(await climaService.getForecast(session, pointId)); } catch { setForecast(null); }
    setLoadingForecast(false);
  };
  const mapPoints: AdminMapPoint[] = points.map((point) => ({
    id: point.id, geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
    color: selectedId === point.id ? "#0f766e" : "#1d7a9b",
    radius: selectedId === point.id ? 10 : 8,
    isSelected: selectedId === point.id,
    onSelect: () => handleSelect(point.id)
  }));
  return <div className="climate-map-layout"><div className="climate-map-layout__map"><div className="climate-map-caption"><strong>{points.length}</strong> puntos territoriales. Haga clic en un punto para ver el detalle clim\u00E1tico.{selectedId ? <button className="climate-map-caption__reset" onClick={() => setSelectedId(null)}>Limpiar selecci\u00F3n</button> : null}</div><AdminMap points={mapPoints} emptyMessage="No hay puntos climaticos configurados."/><div className="climate-map-legend"><span className="climate-map-legend__dot climate-map-legend__dot--normal"/><span>Punto clim\u00E1tico</span><span className="climate-map-legend__dot climate-map-legend__dot--selected"/><span>Seleccionado</span></div></div><div className={`climate-map-panel${selected ? " climate-map-panel--open" : ""}`}><div className="climate-map-panel__inner">{selected ? <ClimateMapPanel point={selected} forecast={forecast} loading={loadingForecast} onClose={() => setSelectedId(null)}/> : null}</div></div></div>;
}

function ClimateMapPanel({ point, forecast, loading, onClose }: { point: ClimatePoint; forecast: ClimateForecast[] | null; loading: boolean; onClose: () => void }) {
  const [dayOffset, setDayOffset] = useState(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = dayOffset === 0;
  const targetDate = new Date(today); targetDate.setDate(today.getDate() + dayOffset);
  const targetDateStr = targetDate.toISOString().slice(0, 10);
  const forecastDays = forecast?.[0]?.days;
  const readings: ClimateReading[] = useMemo(() => {
    if (isToday) return (point.current ?? []).map((r) => ({ ...r }));
    if (!forecastDays) return [];
    return forecastDays.filter((d) => d.validAt?.startsWith(targetDateStr)).map((d) => ({ variable: d.variable, value: d.value, unit: d.unit, type: "PRONOSTICO", dataAt: d.validAt, receivedAt: d.validAt, model: null }));
  }, [point.current, forecastDays, isToday, targetDateStr]);
  const dayLabels = useMemo(() => {
    const fmt = (d: Date) => new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(d);
    return [
      `Hoy ${fmt(today)}`,
      `+1d ${fmt(new Date(today.getTime() + 86400000))}`,
      `+2d ${fmt(new Date(today.getTime() + 172800000))}`,
      `+3d ${fmt(new Date(today.getTime() + 259200000))}`
    ];
  }, []);
  return (
    <>
      <div className="climate-map-panel__header">
        <div>
          <h3>{point.name}</h3>
          <span>{point.district}, {point.department} · {isToday ? "Actual" : "Pron\u00F3stico"}</span>
        </div>
        <button className="climate-map-panel__close" onClick={onClose} aria-label="Cerrar panel">{"\u00D7"}</button>
      </div>
      <div className="climate-map-panel__body">
        <div className="climate-map-panel__dates">
          {[0, 1, 2, 3].map((offset) => (
            <button key={offset} className={offset === dayOffset ? "active" : ""} onClick={() => setDayOffset(offset)}>
              {dayLabels[offset]}
            </button>
          ))}
        </div>
        {loading
          ? <div className="climate-map-panel__loading">Cargando pron\u00F3stico...</div>
          : readings.length === 0
            ? <div className="climate-map-panel__empty">Sin datos disponibles para este d\u00EDa.</div>
            : <>
                <PanelSummary readings={readings}/>
                <ReadingGroups readings={readings}/>
              </>
        }
      </div>
    </>
  );
}

function PanelSummary({ readings }: { readings: ClimateReading[] }) {
  const cards = [
    [Thermometer, "Temperatura", "temperature_2m"],
    [Droplets, "Humedad", "relative_humidity_2m"],
    [CloudRain, "Precipitaci\u00F3n", "precipitation"],
    [Wind, "Viento", "wind_speed_10m"]
  ] as const;
  return <div className="climate-map-panel__summary">{cards.map(([Icon, title, variable]) => { const r = readings.find((item) => item.variable === variable); return <article key={variable}><Icon aria-hidden="true" size={16}/><div><span style={{ display: "block", fontSize: ".7rem", color: "var(--muted-foreground, #52606d)" }}>{title}</span><strong>{r ? `${formatValue(r.value)} ${r.unit}` : "-"}</strong></div></article>; })}</div>;
}

function SummaryView({ summary, session }: { summary: Summary; session: NonNullable<ReturnType<typeof useAuthSession>["session"]> }) {
  const [selectedId, setSelectedId] = useState(summary.points[0]?.id ?? "");
  const [forecast, setForecast] = useState<ClimateForecast[] | null>(null);
  const selected = summary.points.find((p) => p.id === selectedId) ?? summary.points[0];
  useEffect(() => { if (selectedId) { void climaService.getForecast(session, selectedId).then(setForecast).catch(() => setForecast(null)); } }, [selectedId, session]);
  return <div className="climate-stack">
    <section className="climate-summary-hero"><div><p className="eyebrow">Lectura territorial</p><h3 className="title title--section">Condiciones actuales estimadas</h3><span>Compare zonas y consulte la tendencia para tomar decisiones.</span></div><div className="climate-summary-hero__legend"><Badge value="ESTIMADO"/><span>Modelo geografico</span></div></section>
    <PointSelector points={summary.points} value={selectedId} onChange={setSelectedId}/>
    {selected && <section className="climate-data-section"><header><div><p className="eyebrow">Open-Meteo · estimado</p><h3 className="title title--section">{selected.name} <small>{selected.district}</small></h3></div><span className="climate-badge">{selected.current?.length ? `Actualizado ${latestDate(selected.current)}` : "Sin datos recientes"}</span></header><SummaryMetrics readings={selected.current ?? []}/></section>}
    <SummaryComparison points={summary.points}/>
    <SummaryMiniForecast forecast={forecast} pointName={selected?.name ?? ""}/>
    <ReadingGroups readings={selected?.current ?? []}/>
    <section className="climate-split"><ClimateTable title="Alertas activas" empty="No hay alertas climaticas activas." headers={["Zona", "Condicion", "Valor", "Severidad", "Inicio"]} rows={summary.alerts.map((item) => [item.pointName, label(item.variable), `${item.value} ${item.unit}`, <Badge key="severity" value={item.severity}/>, date(item.startsAt)])}/><SourcesView items={summary.sources} compact/></section>
  </div>;
}

const COMPARE_VARS = [
  ["Temperatura", "temperature_2m", "\u00B0C"],
  ["Humedad", "relative_humidity_2m", "%"],
  ["VPD", "vapour_pressure_deficit", "kPa"],
  ["Viento", "wind_speed_10m", "km/h"]
] as const;

function SummaryComparison({ points }: { points: ClimatePoint[] }) {
  const data = useMemo(() => COMPARE_VARS.map(([labelVar, variable]) => {
    const row: Record<string, string | number> = { variable: labelVar };
    for (const p of points) { const r = p.current?.find((c) => c.variable === variable); row[p.name] = r ? Number(r.value) : 0; }
    return row;
  }), [points]);
  const allZero = data.every((d) => Object.values(d).every((v) => typeof v !== "number" || v === 0));
  if (allZero || points.length === 0) return null;
  return <section className="climate-chart-card"><header className="climate-chart-card__header"><div><p className="eyebrow">Comparativo territorial</p><h3 className="title title--section">Variables clave por zona</h3><small>Valores actuales estimados para cada punto climatico.</small></div></header><ResponsiveContainer height={240} width="100%"><BarChart data={data}><XAxis dataKey="variable"/><YAxis/><Tooltip/><Legend/>{points.map((p, i) => <Bar key={p.id} dataKey={p.name} fill={LINE_COLORS[i % LINE_COLORS.length]} radius={[5, 5, 0, 0]}/>)}</BarChart></ResponsiveContainer></section>;
}

function SummaryMiniForecast({ forecast, pointName }: { forecast: ClimateForecast[] | null; pointName: string }) {
  if (!forecast?.[0]?.days?.length) return null;
  const days = forecast[0].days;
  const tempData = useMemo(() => mergeByDate(days, ["temperature_2m_max", "temperature_2m_min"]), [days]);
  const rainData = useMemo(() => days.filter((d) => d.variable === "precipitation_sum").map((d) => ({ date: dateOnly(d.validAt), value: Number(d.value) })).filter((d) => Number.isFinite(d.value)).slice(0, 5), [days]);
  const tempUnit = days.find((d) => d.variable === "temperature_2m_max")?.unit ?? "\u00B0C";
  const rainUnit = days.find((d) => d.variable === "precipitation_sum")?.unit ?? "mm";
  return <section className="climate-data-section"><header><div><p className="eyebrow">Tendencia</p><h3 className="title title--section">{pointName} <small>pr\u00F3ximos d\u00EDas</small></h3></div></header><div className="climate-chart-grid--two-col">
    <div className="climate-chart-card" style={{ minHeight: 220 }}><header className="climate-chart-card__header"><div><h3 className="title title--section">Temperatura</h3><small>M\u00E1x / M\u00EDn</small></div></header><ResponsiveContainer height={140} width="100%"><LineChart data={tempData}><XAxis dataKey="date"/><YAxis unit={` ${tempUnit}`}/><Tooltip formatter={(value, name) => [`${formatValue(String(value))} ${tempUnit}`, label(String(name))]}/><Line dataKey="temperature_2m_max" stroke="#ef4444" strokeWidth={2} type="monotone" dot={{ r: 2 }}/><Line dataKey="temperature_2m_min" stroke="#3b82f6" strokeWidth={2} type="monotone" dot={{ r: 2 }}/></LineChart></ResponsiveContainer></div>
    <div className="climate-chart-card" style={{ minHeight: 220 }}><header className="climate-chart-card__header"><div><h3 className="title title--section">Precipitaci\u00F3n</h3><small>Lluvia diaria acumulada</small></div></header><ResponsiveContainer height={140} width="100%"><BarChart data={rainData}><XAxis dataKey="date"/><YAxis domain={[0, (dataMax: number) => (Number.isFinite(dataMax) ? Math.max(dataMax, 1) : 1)]} unit={` ${rainUnit}`}/><Tooltip formatter={(value) => [`${formatValue(String(value))} ${rainUnit}`, "Precipitaci\u00F3n"]}/><Bar dataKey="value" fill="#0284c7" radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer></div>
  </div></section>;
}

function SummaryMetrics({ readings }: { readings: ClimateReading[] }) { const cards = [[Thermometer, "Temperatura", "temperature_2m"], [Droplets, "Humedad", "relative_humidity_2m"], [CloudRain, "Lluvia", "precipitation"], [Wind, "Viento", "wind_speed_10m"], [Sun, "Radiacion", "shortwave_radiation"], [Gauge, "VPD", "vapour_pressure_deficit"]] as const; return <div className="climate-metric-grid">{cards.map(([Icon, title, variable]) => { const reading = readings.find((item) => item.variable === variable); return <article key={variable}><Icon aria-hidden="true" size={20}/><span>{title}</span><strong>{reading ? `${formatValue(reading.value)} ${reading.unit}` : "Sin dato"}</strong></article>; })}</div>; }

function ForecastView({ forecasts }: { forecasts: ClimateForecast[] }) {
  const [selectedId, setSelectedId] = useState(forecasts[0]?.id ?? ""); const point = forecasts.find((item) => item.id === selectedId) ?? forecasts[0];
  if (!point) return <Empty message="No hay pronosticos disponibles todavia."/>;
  return <div className="climate-stack"><PointSelector points={forecasts} value={point.id} onChange={setSelectedId}/><ForecastSummary days={point.days}/><div className="climate-chart-grid"><ForecastChart title="Temperatura" caption="Evolucion diaria" days={point.days} variables={["temperature_2m_max", "temperature_2m_min"]} kind="line" height={340} showAll/><div className="climate-chart-grid--two-col"><ForecastChart title="Agua y demanda hidrica" caption="Acumulados, probabilidad y ET" days={point.days} variables={["precipitation_sum", "precipitation_probability_max", "et0_fao_evapotranspiration"]} kind="bar"/><ForecastChart title="Atmosfera" caption="Viento, rafagas, radiacion e insolacion" days={point.days} variables={["wind_speed_10m_max", "wind_gusts_10m_max", "shortwave_radiation_sum", "sunshine_duration"]} kind="area"/></div></div></div>;
}

function ForecastSummary({ days }: { days: ClimateForecast["days"] }) {
  const agg = useMemo(() => {
    const over = (variable: string, fn: (acc: number, v: number) => number, init: number) => {
      let result = init; for (const d of days) { if (d.variable === variable && Number.isFinite(Number(d.value))) result = fn(result, Number(d.value)); } return result;
    };
    const unit = (variable: string) => days.find((d) => d.variable === variable)?.unit ?? "";
    return [
      { Icon: ThermometerSun, label: "Temperatura maxima", value: over("temperature_2m_max", Math.max, -Infinity), unit: unit("temperature_2m_max") },
      { Icon: ThermometerSnowflake, label: "Temperatura minima", value: over("temperature_2m_min", Math.min, Infinity), unit: unit("temperature_2m_min") },
      { Icon: CloudRain, label: "Lluvia acumulada", value: over("precipitation_sum", (a, v) => a + v, 0), unit: unit("precipitation_sum") },
      { Icon: Wind, label: "Viento maximo", value: over("wind_speed_10m_max", Math.max, -Infinity), unit: unit("wind_speed_10m_max") },
      { Icon: Sun, label: "Horas de sol (max)", value: over("sunshine_duration", Math.max, -Infinity), unit: unit("sunshine_duration") },
      { Icon: Droplets, label: "Prob. lluvia (max)", value: over("precipitation_probability_max", Math.max, -Infinity), unit: unit("precipitation_probability_max") }
    ];
  }, [days]);
  return <div className="climate-metric-grid">{agg.map(({ Icon, label: lbl, value, unit }) => <article key={lbl}><Icon aria-hidden="true" size={20}/><span>{lbl}</span><strong>{Number.isFinite(value) ? `${value.toFixed(1)} ${unit}` : "Sin dato"}</strong></article>)}</div>;
}

function ForecastChart({ title, caption, days, variables, kind, height = 255, showAll }: { title: string; caption: string; days: ClimateForecast["days"]; variables: string[]; kind: "line" | "bar" | "area"; height?: number; showAll?: boolean }) {
  const available = variables.filter((variable) => days.some((day) => day.variable === variable));
  const [selected, setSelected] = useState(available[0] ?? variables[0]);
  useEffect(() => { if (available.length && !available.includes(selected)) setSelected(available[0]); }, [available.join(","), selected]);
  if (showAll && kind === "line") return <MultiLineChart title={title} caption={caption} days={days} variables={available} height={height}/>;
  const rows = useMemo(() => days.filter((day) => day.variable === selected).map((day) => ({ date: dateOnly(day.validAt), value: Number(day.value) })).filter((day) => Number.isFinite(day.value)), [days, selected]);
  const unit = days.find((day) => day.variable === selected)?.unit ?? "";
  const Chart = kind === "line" ? LineChart : kind === "bar" ? BarChart : AreaChart;
  return <section className="climate-chart-card"><header className="climate-chart-card__header"><div><p className="eyebrow">Pronosticado</p><h3 className="title title--section">{title}</h3><small>{caption}</small></div><label className="field-group"><span className="sr-only">Variable de {title}</span><select value={selected} onChange={(event) => setSelected(event.target.value)}>{available.map((variable) => <option value={variable} key={variable}>{label(variable)}</option>)}</select></label></header>{rows.length === 0 ? <Empty message="La fuente aun no entrega esta variable."/> : <ResponsiveContainer height={height} width="100%"><Chart data={rows}><XAxis dataKey="date"/><YAxis domain={[0, (dataMax: number) => (Number.isFinite(dataMax) ? Math.max(dataMax, 1) : 1)]} unit={` ${unit}`}/><Tooltip formatter={(value) => [`${formatValue(String(value))} ${unit}`, label(selected)]}/>{kind === "line" ? <Line dataKey="value" stroke="#0284c7" strokeWidth={2.5} type="monotone" dot={{ r: 3 }}/>: kind === "bar" ? <Bar dataKey="value" fill="#0f766e" radius={[5, 5, 0, 0]}/>: <Area dataKey="value" stroke="#d97706" fill="#fef3c7" strokeWidth={2.5} type="monotone"/>}</Chart></ResponsiveContainer>}</section>;
}

const LINE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];

function MultiLineChart({ title, caption, days, variables, height }: { title: string; caption: string; days: ClimateForecast["days"]; variables: string[]; height: number }) {
  const rows = useMemo(() => mergeByDate(days, variables), [days, variables.join(",")]);
  const unit = days.find((day) => variables.includes(day.variable))?.unit ?? "";
  if (rows.length === 0 || variables.length === 0) return <section className="climate-chart-card"><header className="climate-chart-card__header"><div><p className="eyebrow">Pronosticado</p><h3 className="title title--section">{title}</h3><small>{caption}</small></div></header><Empty message="La fuente aun no entrega esta variable."/></section>;
  return <section className="climate-chart-card"><header className="climate-chart-card__header"><div><p className="eyebrow">Pronosticado</p><h3 className="title title--section">{title}</h3><small>{caption}</small></div></header><ResponsiveContainer height={height} width="100%"><LineChart data={rows}><XAxis dataKey="date"/><YAxis unit={` ${unit}`}/><Tooltip formatter={(value, name) => [`${formatValue(String(value))} ${unit}`, label(String(name))]}/><Legend formatter={(value) => label(String(value))}/>{variables.map((variable, i) => <Line key={variable} dataKey={variable} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2.5} type="monotone" dot={{ r: 3 }} connectNulls/>)}</LineChart></ResponsiveContainer></section>;
}

function mergeByDate(days: ClimateForecast["days"], variables: string[]): Array<Record<string, string | number>> {
  const map = new Map<string, Record<string, string | number>>();
  for (const variable of variables) {
    for (const day of days) {
      if (day.variable !== variable) continue;
      const d = dateOnly(String(day.validAt));
      if (!map.has(d)) map.set(d, { date: d });
      const entry = map.get(d)!;
      entry[variable] = Number(day.value);
    }
  }
  return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
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
function dateOnly(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(parsed); }
function latestDate(readings: ClimateReading[] | undefined) { const value = readings?.[0]?.dataAt; return value ? date(value) : "sin registro"; }
function formatValue(value: number | string) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric.toFixed(1) : "Sin dato"; }
function label(variable: string) { return ({ temperature_2m: "Temperatura", apparent_temperature: "Temperatura aparente", dew_point_2m: "Punto de rocio", temperature_2m_max: "Temperatura maxima", temperature_2m_min: "Temperatura minima", relative_humidity_2m: "Humedad relativa", vapour_pressure_deficit: "VPD", precipitation: "Precipitacion", precipitation_sum: "Precipitacion acumulada", precipitation_probability_max: "Probabilidad de lluvia", wind_speed_10m: "Viento a 10 m", wind_speed_10m_max: "Viento maximo", wind_direction_10m: "Direccion del viento", wind_gusts_10m: "Rafagas", wind_gusts_10m_max: "Rafagas maximas", shortwave_radiation: "Radiacion solar", shortwave_radiation_sum: "Radiacion acumulada", sunshine_duration: "Horas de sol", cloud_cover: "Nubosidad", surface_pressure: "Presion superficial", et0_fao_evapotranspiration: "ET de referencia", soil_temperature_0cm: "Temperatura de suelo regional", soil_moisture_0_to_1cm: "Humedad de suelo regional" } as Record<string, string>)[variable] ?? variable.replaceAll("_", " "); }
function groupReadings(readings: ClimateReading[]) { const variables: Array<[string, string[]]> = [["Temperatura", ["temperature_2m", "apparent_temperature", "dew_point_2m", "soil_temperature_0cm"]], ["Humedad y VPD", ["relative_humidity_2m", "vapour_pressure_deficit", "soil_moisture_0_to_1cm"]], ["Precipitacion", ["precipitation"]], ["Viento", ["wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"]], ["Radiacion y nubosidad", ["shortwave_radiation", "cloud_cover", "surface_pressure"]]]; return variables.map(([title, names]) => [title, readings.filter((reading) => names.includes(reading.variable))] as [string, ClimateReading[]]); }
