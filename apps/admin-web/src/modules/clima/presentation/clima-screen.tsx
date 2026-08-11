"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity, ChartNoAxesCombined, Database, Droplets, MapPinned, X } from "lucide-react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { AdminMap, type AdminMapPoint } from "../../../shared/components/admin-map";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import {
  climaService,
  type ClimateForecast,
  type ClimatePoint,
  type ClimateReading,
  type ClimateSource,
  type Reservoir,
  type ReservoirReading
} from "../services/clima.service";
import {
  forecastReadingsForDate,
  limaDateKeyAtOffset,
  mergeHistoryByTimestamp
} from "./clima-view.utils";

export type ClimateSection =
  "resumen" | "mapa" | "pronostico" | "historial" | "estaciones" | "alertas" | "fuentes";

type Session = NonNullable<ReturnType<typeof useAuthSession>["session"]>;
type AlertItem = {
  publicId: string;
  pointName: string;
  severity: string;
  variable: string;
  value: number;
  unit: string;
  startsAt: string;
  status?: string;
};
type Summary = {
  points: ClimatePoint[];
  alerts: AlertItem[];
  sources: ClimateSource[];
  reservorios: Reservoir[];
};

const EMPTY_FORECAST_DAYS: ClimateForecast["days"] = [];
const LINE_COLORS = ["#0f766e", "#2563eb", "#d97706", "#dc2626", "#7c3aed"];

const titles: Record<ClimateSection, [string, string]> = {
  resumen: ["Resumen Agroclimático", "Lectura territorial comparada y tendencias próximas."],
  mapa: [
    "Mapa agroclimático",
    "Explore puntos territoriales y su pronóstico de tres días."
  ],
  pronostico: ["Pronóstico", "Evolución diaria por variable y punto territorial."],
  historial: [
    "Historial Agroclimático",
    "Series temporales persistidas con trazabilidad del dato."
  ],
  estaciones: [
    "Estaciones meteorológicas",
    "Inventario y estado operativo de estaciones."
  ],
  alertas: [
    "Alertas climáticas",
    "Eventos meteorológicos generales, no diagnósticos agronómicos."
  ],
  fuentes: ["Estado de fuentes de datos", "Disponibilidad y trazabilidad de proveedores."]
};

const CURRENT_GROUPS: Array<{ title: string; variables: string[] }> = [
  {
    title: "Temperatura",
    variables: [
      "temperature_2m",
      "apparent_temperature",
      "dew_point_2m",
      "soil_temperature_0cm"
    ]
  },
  {
    title: "Humedad y VPD (déficit de presión de vapor)",
    variables: [
      "relative_humidity_2m",
      "vapour_pressure_deficit",
      "soil_moisture_0_to_1cm"
    ]
  },
  {
    title: "Lluvia y atmósfera",
    variables: ["precipitation", "cloud_cover", "surface_pressure"]
  },
  {
    title: "Viento y radiación",
    variables: [
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "shortwave_radiation"
    ]
  }
];

const DAILY_GROUPS: Array<{ title: string; variables: string[] }> = [
  {
    title: "Temperatura máxima y mínima",
    variables: ["temperature_2m_max", "temperature_2m_min"]
  },
  {
    title: "Lluvia y demanda hídrica",
    variables: [
      "precipitation_sum",
      "precipitation_probability_max",
      "et0_fao_evapotranspiration"
    ]
  },
  {
    title: "Viento",
    variables: ["wind_speed_10m_max", "wind_gusts_10m_max"]
  },
  {
    title: "Radiación e insolación",
    variables: ["shortwave_radiation_sum", "sunshine_duration"]
  }
];

export function ClimaScreen({ section }: { section: ClimateSection }) {
  const { session } = useAuthSession();
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setData(null);
    setError(null);
    const load =
      section === "resumen"
        ? climaService.getSummary
        : section === "mapa"
          ? climaService.getMap
          : section === "pronostico"
            ? climaService.getForecast
            : section === "estaciones"
              ? climaService.getStations
              : section === "alertas"
                ? climaService.getAlerts
                : section === "fuentes"
                  ? climaService.getSources
                  : climaService.getPoints;

    void load(session)
      .then(setData)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar el módulo climático."
        )
      );
  }, [section, session]);

  const [title, description] = titles[section];
  if (error) return <ErrorState description={error} />;
  if (!data || !session) {
    return <LoadingState description="Cargando información climática territorial." />;
  }

  return (
    <section className="panel-grid">
      <article className="panel climate-screen">
        <ToolbarActions
          eyebrow="Clima territorial"
          title={title}
          description={description}
        />
        <ClimateNotice />
        {section === "mapa" ? (
          <ClimateMap points={data as ClimatePoint[]} session={session} />
        ) : (
          <ClimateContent section={section} data={data} session={session} />
        )}
      </article>
    </section>
  );
}

function ClimateContent({
  section,
  data,
  session
}: {
  section: ClimateSection;
  data: unknown;
  session: Session;
}) {
  if (section === "resumen")
    return <SummaryView summary={data as Summary} session={session} />;
  if (section === "pronostico")
    return <ForecastView forecasts={data as ClimateForecast[]} />;
  if (section === "historial")
    return <HistoryView points={data as ClimatePoint[]} session={session} />;
  if (section === "estaciones")
    return <StationsView items={data as Array<Record<string, unknown>>} />;
  if (section === "alertas") return <AlertsView items={data as AlertItem[]} />;
  return <SourcesView items={data as ClimateSource[]} />;
}

function ClimateNotice() {
  return (
    <aside className="climate-notice" role="note">
      <MapPinned aria-hidden="true" size={18} />
      <div>
        <strong>Dato territorial estimado.</strong>
        Los modelos representan cuadrículas geográficas; no sustituyen una medición de
        campo.
      </div>
    </aside>
  );
}

function ClimateMap({ points, session }: { points: ClimatePoint[]; session: Session }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"clima" | "reservorio">("clima");
  const [forecast, setForecast] = useState<ClimateForecast[] | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [reservorios, setReservorios] = useState<Reservoir[]>([]);
  const forecastRequest = useRef(0);
  const selected =
    selectedKind === "clima" ? points.find((point) => point.id === selectedId) : null;
  const selectedReservoir =
    selectedKind === "reservorio"
      ? reservorios.find((reservoir) => reservoir.publicId === selectedId)
      : null;

  useEffect(() => {
    void climaService.getReservorios(session).then(setReservorios).catch(() => setReservorios([]));
  }, [session]);

  async function handleSelect(pointId: string) {
    const requestId = ++forecastRequest.current;
    setSelectedId(pointId);
    setSelectedKind("clima");
    setForecast(null);
    setForecastError(null);
    setLoadingForecast(true);
    try {
      const nextForecast = await climaService.getForecast(session, pointId);
      if (requestId === forecastRequest.current) setForecast(nextForecast);
    } catch (reason) {
      if (requestId === forecastRequest.current) {
        setForecastError(
          reason instanceof Error ? reason.message : "No se pudo cargar el pronóstico."
        );
      }
    } finally {
      if (requestId === forecastRequest.current) setLoadingForecast(false);
    }
  }

  function handleReservoirSelect(publicId: string) {
    setSelectedId(publicId);
    setSelectedKind("reservorio");
    setForecast(null);
    setForecastError(null);
    setLoadingForecast(false);
  }

  function clearSelection() {
    forecastRequest.current += 1;
    setSelectedId(null);
    setSelectedKind("clima");
    setForecast(null);
    setForecastError(null);
    setLoadingForecast(false);
  }

  const mapPoints: AdminMapPoint[] = [
    ...points.map((point) => ({
      id: point.id,
      geometry: { type: "Point" as const, coordinates: [point.longitude, point.latitude] as [number, number] },
      color: selectedId === point.id && selectedKind === "clima" ? "#0f766e" : "#1d7a9b",
      radius: selectedId === point.id && selectedKind === "clima" ? 10 : 8,
      isSelected: selectedId === point.id && selectedKind === "clima",
      onSelect: () => void handleSelect(point.id)
    })),
    ...reservorios.map((reservoir) => ({
      id: reservoir.publicId,
      geometry: { type: "Point" as const, coordinates: [reservoir.longitude, reservoir.latitude] as [number, number] },
      color: selectedId === reservoir.publicId && selectedKind === "reservorio" ? "#0369a1" : "#0284c7",
      radius: selectedId === reservoir.publicId && selectedKind === "reservorio" ? 10 : 8,
      isSelected: selectedId === reservoir.publicId && selectedKind === "reservorio",
      onSelect: () => handleReservoirSelect(reservoir.publicId)
    }))
  ];

  return (
    <div className="climate-map-layout">
      <div className="climate-map-layout__map">
        <div className="climate-map-caption">
          <span>
            <strong>{points.length}</strong> puntos climáticos{" "}
            <strong>{reservorios.length}</strong> reservorios
          </span>
          <span>Seleccione un punto para consultar condiciones y pronóstico.</span>
          {selectedId ? (
            <button
              className="climate-map-caption__reset"
              onClick={clearSelection}
              type="button"
            >
              Limpiar selección
            </button>
          ) : null}
        </div>
        <AdminMap
          points={mapPoints}
          emptyMessage="No hay puntos climáticos ni reservorios configurados."
        />
        <div className="climate-map-legend" aria-label="Leyenda del mapa">
          <span className="climate-map-legend__dot climate-map-legend__dot--normal" />
          <span>Punto climático</span>
          <span className="climate-map-legend__dot climate-map-legend__dot--selected" />
          <span>Seleccionado</span>
          <span className="climate-map-legend__dot climate-map-legend__dot--reservoir" />
          <span>Reservorio</span>
        </div>
      </div>
      <div
        className={`climate-map-panel${selected || selectedReservoir ? " climate-map-panel--open" : ""}`}
      >
        <div className="climate-map-panel__inner">
          {selected ? (
            <ClimateMapPanel
              point={selected}
              forecast={forecast}
              forecastError={forecastError}
              loading={loadingForecast}
              onClose={clearSelection}
            />
          ) : selectedReservoir ? (
            <ReservoirMapPanel
              reservoir={selectedReservoir}
              session={session}
              onClose={clearSelection}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ClimateMapPanel({
  point,
  forecast,
  forecastError,
  loading,
  onClose
}: {
  point: ClimatePoint;
  forecast: ClimateForecast[] | null;
  forecastError: string | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [dayOffset, setDayOffset] = useState(0);
  const isToday = dayOffset === 0;
  const forecastDays = forecast?.[0]?.days ?? EMPTY_FORECAST_DAYS;
  const dateKey = limaDateKeyAtOffset(dayOffset);
  const readings = useMemo(
    () =>
      isToday ? (point.current ?? []) : forecastReadingsForDate(forecastDays, dateKey),
    [dateKey, forecastDays, isToday, point.current]
  );

  return (
    <>
      <div className="climate-map-panel__header">
        <div>
          <p className="eyebrow">{isToday ? "Condición actual" : "Pronóstico diario"}</p>
          <h3>{point.name}</h3>
          <span>
            {point.district}, {point.department}
          </span>
        </div>
        <button
          className="climate-map-panel__close"
          onClick={onClose}
          aria-label="Cerrar panel"
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="climate-map-panel__body">
        <div className="climate-map-panel__dates" aria-label="Día del pronóstico">
          {[0, 1, 2, 3].map((offset) => (
            <button
              key={offset}
              className={offset === dayOffset ? "active" : ""}
              onClick={() => setDayOffset(offset)}
              type="button"
            >
              {offset === 0 ? "Hoy" : `+${offset} día${offset > 1 ? "s" : ""}`}
              <small>{shortDate(limaDateKeyAtOffset(offset))}</small>
            </button>
          ))}
        </div>
        {loading && !isToday ? (
          <div className="climate-map-panel__loading">Cargando pronóstico...</div>
        ) : forecastError && !isToday ? (
          <div className="climate-map-panel__empty">{forecastError}</div>
        ) : readings.length === 0 ? (
          <div className="climate-map-panel__empty">
            Sin datos disponibles para este día.
          </div>
        ) : (
          <MetricChartGrid
            readings={readings}
            groups={isToday ? CURRENT_GROUPS : DAILY_GROUPS}
            compact
          />
        )}
      </div>
    </>
  );
}

function ReservoirMapPanel({
  reservoir,
  session,
  onClose
}: {
  reservoir: Reservoir;
  session: Session;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<ReservoirReading[]>([]);

  useEffect(() => {
    void climaService
      .getReservorioHistory(session, reservoir.publicId, { variable: "volumen_mmc" })
      .then((response) => setHistory(response.rows))
      .catch(() => setHistory([]));
  }, [reservoir.publicId, session]);

  const pct = reservoir.capacityMaxMmc && reservoir.latestVolumeMmc != null
    ? Math.round((reservoir.latestVolumeMmc / reservoir.capacityMaxMmc) * 100)
    : null;

  const chartData = [...history]
    .reverse()
    .slice(0, 14)
    .map((reading) => ({
      date: dateOnly(reading.dataAt),
      value: reading.value
    }));

  return (
    <>
      <div className="climate-map-panel__header">
        <div>
          <p className="eyebrow">Reservorio</p>
          <h3>{reservoir.name}</h3>
          <span>
            {reservoir.district}, {reservoir.department}
          </span>
        </div>
        <button
          className="climate-map-panel__close"
          onClick={onClose}
          aria-label="Cerrar panel"
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="climate-map-panel__body">
        {reservoir.latestDataAt ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
              {reservoir.latestVolumeMmc != null ? (
                <div>
                  <small style={{ color: "var(--color-text-muted)" }}>Volumen</small>
                  <strong style={{ display: "block" }}>
                    {reservoir.latestVolumeMmc.toFixed(1)} MMC
                  </strong>
                  {pct !== null ? (
                    <span className={`climate-badge${pct < 30 ? " climate-badge--degrada" : ""}`}>
                      {pct}%
                    </span>
                  ) : null}
                </div>
              ) : null}
              {reservoir.latestCota != null ? (
                <div>
                  <small style={{ color: "var(--color-text-muted)" }}>Cota</small>
                  <strong style={{ display: "block" }}>{reservoir.latestCota.toFixed(2)} msnm</strong>
                </div>
              ) : null}
              {reservoir.latestInflowM3s != null ? (
                <div>
                  <small style={{ color: "var(--color-text-muted)" }}>Caudal entrada</small>
                  <strong style={{ display: "block" }}>{reservoir.latestInflowM3s.toFixed(1)} m³/s</strong>
                </div>
              ) : null}
              {reservoir.latestOutflowM3s != null ? (
                <div>
                  <small style={{ color: "var(--color-text-muted)" }}>Caudal salida</small>
                  <strong style={{ display: "block" }}>{reservoir.latestOutflowM3s.toFixed(1)} m³/s</strong>
                </div>
              ) : null}
              {reservoir.latestEvaporationMm != null ? (
                <div>
                  <small style={{ color: "var(--color-text-muted)" }}>Evaporación</small>
                  <strong style={{ display: "block" }}>{reservoir.latestEvaporationMm.toFixed(1)} mm</strong>
                </div>
              ) : null}
            </div>
            {chartData.length > 1 ? (
              <ResponsiveContainer height={180} width="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis unit=" MMC" />
                  <Tooltip formatter={(value) => [`${formatValue(String(value))} MMC`, "Volumen"]} />
                  <Line dataKey="value" stroke="#0284c7" strokeWidth={2.5} type="monotone" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="climate-map-panel__empty">Sin datos históricos suficientes.</div>
            )}
            <small style={{ display: "block", marginTop: "0.5rem", color: "var(--color-text-muted)" }}>
              Última lectura: {date(reservoir.latestDataAt)}
            </small>
          </>
        ) : (
          <div className="climate-map-panel__empty">Sin lecturas registradas.</div>
        )}
      </div>
    </>
  );
}

function SummaryView({ summary, session }: { summary: Summary; session: Session }) {
  const [selectedId, setSelectedId] = useState(summary.points[0]?.id ?? "");
  const [forecast, setForecast] = useState<ClimateForecast[] | null>(null);
  const selected =
    summary.points.find((point) => point.id === selectedId) ?? summary.points[0];

  useEffect(() => {
    if (!selectedId) return;
    let ignore = false;
    setForecast(null);
    void climaService
      .getForecast(session, selectedId)
      .then((nextForecast) => {
        if (!ignore) setForecast(nextForecast);
      })
      .catch(() => {
        if (!ignore) setForecast(null);
      });
    return () => {
      ignore = true;
    };
  }, [selectedId, session]);

  return (
    <div className="climate-stack">
      <section className="climate-summary-hero">
        <div>
          <p className="eyebrow">Lectura territorial</p>
          <h3 className="title title--section">
            El clima como una serie, no como una cifra aislada
          </h3>
          <span>
            Compare zonas, identifique cambios y revise la procedencia de cada dato.
          </span>
        </div>
        <div className="climate-summary-hero__legend">
          <Activity aria-hidden="true" size={19} />
          <div>
            <strong>{summary.points.length}</strong>
            <span>zonas monitoreadas</span>
          </div>
        </div>
      </section>

      <PointSelector
        points={summary.points}
        value={selectedId}
        onChange={setSelectedId}
      />

      {selected ? (
        <section className="climate-data-section">
          <header>
            <div>
              <p className="eyebrow">Open-Meteo · estimado</p>
              <h3 className="title title--section">
                {selected.name} <small>{selected.district}</small>
              </h3>
            </div>
            <span className="climate-badge">
              {selected.current?.length
                ? `Actualizado ${latestDate(selected.current)}`
                : "Sin datos recientes"}
            </span>
          </header>
          <MetricChartGrid readings={selected.current ?? []} groups={CURRENT_GROUPS} />
        </section>
      ) : null}

      <ReservoirStatusCard reservorios={summary.reservorios} />

      <TerritorialComparison points={summary.points} />
      <SummaryMiniForecast forecast={forecast} pointName={selected?.name ?? ""} />
    </div>
  );
}

const COMPARISON_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "vapour_pressure_deficit",
  "wind_speed_10m",
  "precipitation",
  "shortwave_radiation"
];

function TerritorialComparison({ points }: { points: ClimatePoint[] }) {
  const available = COMPARISON_VARIABLES.filter((variable) =>
    points.some((point) =>
      point.current?.some((reading) => reading.variable === variable)
    )
  );
  const [selectedVariable, setSelectedVariable] = useState(
    available[0] ?? COMPARISON_VARIABLES[0]
  );

  useEffect(() => {
    if (available.length && !available.includes(selectedVariable)) {
      setSelectedVariable(available[0]);
    }
  }, [available.join(","), selectedVariable]);

  const rows = points
    .map((point) => {
      const reading = point.current?.find((item) => item.variable === selectedVariable);
      return reading
        ? { zone: point.name, value: Number(reading.value), unit: reading.unit }
        : null;
    })
    .filter((row): row is { zone: string; value: number; unit: string } => Boolean(row));
  const unit = rows[0]?.unit ?? "";

  if (!available.length) return null;

  return (
    <section className="climate-chart-card climate-chart-card--featured">
      <header className="climate-chart-card__header">
        <div>
          <p className="eyebrow">Comparativo territorial</p>
          <h3 className="title title--section">Una variable, todas las zonas</h3>
          <small>
            Cada eje conserva una sola unidad para evitar comparaciones engañosas.
          </small>
        </div>
        <label className="field-group">
          <span>Variable</span>
          <select
            value={selectedVariable}
            onChange={(event) => setSelectedVariable(event.target.value)}
          >
            {available.map((variable) => (
              <option key={variable} value={variable}>
                {label(variable)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div
        className="climate-chart-canvas"
        aria-label={`Comparación de ${label(selectedVariable)}`}
      >
        <ResponsiveContainer height={300} width="100%">
          <BarChart data={rows} margin={{ left: 4, right: 18, top: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="zone" />
            <YAxis unit={unit ? ` ${unit}` : ""} />
            <Tooltip
              formatter={(value) => [
                `${formatValue(String(value))} ${unit}`,
                label(selectedVariable)
              ]}
            />
            <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SummaryMiniForecast({
  forecast,
  pointName
}: {
  forecast: ClimateForecast[] | null;
  pointName: string;
}) {
  const days = forecast?.[0]?.days ?? EMPTY_FORECAST_DAYS;
  const tempData = useMemo(
    () => mergeByDate(days, ["temperature_2m_max", "temperature_2m_min"]).slice(0, 7),
    [days]
  );
  const rainData = useMemo(
    () =>
      days
        .filter((day) => day.variable === "precipitation_sum")
        .map((day) => ({ date: dateOnly(day.validAt), value: Number(day.value) }))
        .filter((day) => Number.isFinite(day.value))
        .slice(0, 7),
    [days]
  );

  if (!days.length) return null;
  const tempUnit =
    days.find((day) => day.variable === "temperature_2m_max")?.unit ?? "°C";
  const rainUnit = days.find((day) => day.variable === "precipitation_sum")?.unit ?? "mm";

  return (
    <section className="climate-data-section">
      <header>
        <div>
          <p className="eyebrow">Tendencia próxima</p>
          <h3 className="title title--section">
            {pointName} <small>7 días</small>
          </h3>
        </div>
      </header>
      <div className="climate-chart-grid--two-col">
        <ChartShell title="Temperatura" caption="Máxima y mínima diaria">
          <ResponsiveContainer height={230} width="100%">
            <LineChart data={tempData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis unit={` ${tempUnit}`} />
              <Tooltip
                formatter={(value, name) => [
                  `${formatValue(String(value))} ${tempUnit}`,
                  label(String(name))
                ]}
              />
              <Legend formatter={(value) => label(String(value))} />
              <Line
                dataKey="temperature_2m_max"
                stroke="#dc2626"
                strokeWidth={2.5}
                type="monotone"
              />
              <Line
                dataKey="temperature_2m_min"
                stroke="#2563eb"
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>
        <ChartShell title="Precipitación" caption="Lluvia diaria acumulada">
          <ResponsiveContainer height={230} width="100%">
            <BarChart data={rainData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis unit={` ${rainUnit}`} />
              <Tooltip
                formatter={(value) => [
                  `${formatValue(String(value))} ${rainUnit}`,
                  "Precipitación"
                ]}
              />
              <Bar dataKey="value" fill="#0284c7" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </section>
  );
}

function ReservoirStatusCard({ reservorios }: { reservorios: Reservoir[] }) {
  if (!reservorios?.length) return null;

  return (
    <section className="climate-data-section">
      <header>
        <div>
          <p className="eyebrow">Reservorios</p>
          <h3 className="title title--section">
            Estado de embalses <small>Poechos &middot; San Lorenzo</small>
          </h3>
        </div>
      </header>
      <div className="climate-chart-grid--two-col">
        {reservorios.map((reservoir) => {
          const pct = reservoir.capacityMaxMmc && reservoir.latestVolumeMmc != null
            ? Math.round((reservoir.latestVolumeMmc / reservoir.capacityMaxMmc) * 100)
            : null;

          return (
            <section className="climate-chart-card" key={reservoir.publicId}>
              <header className="climate-chart-card__header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Droplets aria-hidden="true" size={20} color="#0284c7" />
                    <h3 className="title title--section">{reservoir.name}</h3>
                  </div>
                  <small>
                    {reservoir.province}, {reservoir.department}
                  </small>
                </div>
                {pct !== null ? (
                  <span className={`climate-badge${pct < 30 ? " climate-badge--degrada" : pct > 70 ? " climate-badge--operativa" : ""}`}>
                    {pct}%
                  </span>
                ) : null}
              </header>
              <div className="climate-bullet-list">
                {reservoir.latestVolumeMmc != null ? (
                  <div className="climate-bullet">
                    <div className="climate-bullet__label">
                      <span>Volumen</span>
                      <strong>{reservoir.latestVolumeMmc.toFixed(1)} MMC</strong>
                    </div>
                    {pct !== null ? (
                      <div className="climate-bullet__track" role="img" aria-label={`Volumen ${pct}%`}>
                        <span style={{ width: `${Math.max(2, pct)}%`, backgroundColor: pct < 30 ? "#dc2626" : "#0284c7" }} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {reservoir.latestCota != null ? (
                  <div className="climate-bullet">
                    <div className="climate-bullet__label">
                      <span>Cota</span>
                      <strong>{reservoir.latestCota.toFixed(2)} msnm</strong>
                    </div>
                    {reservoir.elevationMaxMasl != null ? (
                      <div className="climate-bullet__track" role="img" aria-label={`Cota`}>
                        <span style={{ width: `${Math.max(2, Math.round((reservoir.latestCota / reservoir.elevationMaxMasl) * 100))}%`, backgroundColor: "#0891b2" }} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {reservoir.latestInflowM3s != null ? (
                  <div className="climate-bullet">
                    <div className="climate-bullet__label">
                      <span>Caudal entrada</span>
                      <strong>{reservoir.latestInflowM3s.toFixed(1)} m³/s</strong>
                    </div>
                  </div>
                ) : null}
                {reservoir.latestOutflowM3s != null ? (
                  <div className="climate-bullet">
                    <div className="climate-bullet__label">
                      <span>Caudal salida</span>
                      <strong>{reservoir.latestOutflowM3s.toFixed(1)} m³/s</strong>
                    </div>
                  </div>
                ) : null}
                {reservoir.latestEvaporationMm != null ? (
                  <div className="climate-bullet">
                    <div className="climate-bullet__label">
                      <span>Evaporación</span>
                      <strong>{reservoir.latestEvaporationMm.toFixed(1)} mm</strong>
                    </div>
                  </div>
                ) : null}
              </div>
              {reservoir.latestDataAt ? (
                <small style={{ display: "block", marginTop: "0.5rem", color: "var(--color-text-muted)" }}>
                  Última lectura: {date(reservoir.latestDataAt)}
                </small>
              ) : (
                <small style={{ display: "block", marginTop: "0.5rem", color: "var(--color-text-muted)" }}>
                  Sin lecturas registradas
                </small>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ForecastView({ forecasts }: { forecasts: ClimateForecast[] }) {
  const [selectedId, setSelectedId] = useState(forecasts[0]?.id ?? "");
  const point = forecasts.find((item) => item.id === selectedId) ?? forecasts[0];
  if (!point) return <Empty message="No hay pronósticos disponibles todavía." />;

  const dates = Array.from(new Set(point.days.map((day) => day.validAt.slice(0, 10))));

  return (
    <div className="climate-stack">
      <PointSelector points={forecasts} value={point.id} onChange={setSelectedId} />
      <section className="climate-context-strip">
        <ChartNoAxesCombined aria-hidden="true" size={22} />
        <div>
          <strong>{point.name}</strong>
          <span>
            {dates.length} días · {point.days.length} observaciones pronosticadas
          </span>
        </div>
        <Badge value="PRONOSTICADO" />
      </section>
      <div className="climate-chart-grid">
        <ForecastChart
          title="Temperatura"
          caption="Evolución máxima y mínima"
          days={point.days}
          variables={["temperature_2m_max", "temperature_2m_min"]}
          kind="line"
          height={340}
          showAll
        />
        <div className="climate-chart-grid--two-col">
          <ForecastChart
            title="Agua y demanda hídrica"
            caption="Lluvia, probabilidad y evapotranspiración"
            days={point.days}
            variables={[
              "precipitation_sum",
              "precipitation_probability_max",
              "et0_fao_evapotranspiration"
            ]}
            kind="bar"
          />
          <ForecastChart
            title="Atmósfera"
            caption="Viento, ráfagas, radiación e insolación"
            days={point.days}
            variables={[
              "wind_speed_10m_max",
              "wind_gusts_10m_max",
              "shortwave_radiation_sum",
              "sunshine_duration"
            ]}
            kind="area"
          />
        </div>
      </div>
    </div>
  );
}

function ForecastChart({
  title,
  caption,
  days,
  variables,
  kind,
  height = 270,
  showAll
}: {
  title: string;
  caption: string;
  days: ClimateForecast["days"];
  variables: string[];
  kind: "line" | "bar" | "area";
  height?: number;
  showAll?: boolean;
}) {
  const available = variables.filter((variable) =>
    days.some((day) => day.variable === variable)
  );
  const [selected, setSelected] = useState(available[0] ?? variables[0]);

  useEffect(() => {
    if (available.length && !available.includes(selected)) setSelected(available[0]);
  }, [available.join(","), selected]);

  if (showAll && kind === "line") {
    return (
      <MultiLineChart
        title={title}
        caption={caption}
        days={days}
        variables={available}
        height={height}
      />
    );
  }

  const rows = days
    .filter((day) => day.variable === selected)
    .map((day) => ({ date: dateOnly(day.validAt), value: Number(day.value) }))
    .filter((day) => Number.isFinite(day.value));
  const unit = days.find((day) => day.variable === selected)?.unit ?? "";

  return (
    <section className="climate-chart-card">
      <header className="climate-chart-card__header">
        <div>
          <p className="eyebrow">Pronosticado</p>
          <h3 className="title title--section">{title}</h3>
          <small>{caption}</small>
        </div>
        <label className="field-group">
          <span className="sr-only">Variable de {title}</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {available.map((variable) => (
              <option value={variable} key={variable}>
                {label(variable)}
              </option>
            ))}
          </select>
        </label>
      </header>
      {rows.length === 0 ? (
        <Empty message="La fuente aún no entrega esta variable." />
      ) : (
        <ResponsiveContainer height={height} width="100%">
          {kind === "bar" ? (
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis unit={` ${unit}`} />
              <Tooltip
                formatter={(value) => [
                  `${formatValue(String(value))} ${unit}`,
                  label(selected)
                ]}
              />
              <Bar dataKey="value" fill="#0f766e" radius={[7, 7, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis unit={` ${unit}`} />
              <Tooltip
                formatter={(value) => [
                  `${formatValue(String(value))} ${unit}`,
                  label(selected)
                ]}
              />
              <Area
                dataKey="value"
                stroke="#d97706"
                fill="#fef3c7"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      )}
    </section>
  );
}

function MultiLineChart({
  title,
  caption,
  days,
  variables,
  height
}: {
  title: string;
  caption: string;
  days: ClimateForecast["days"];
  variables: string[];
  height: number;
}) {
  const rows = useMemo(() => mergeByDate(days, variables), [days, variables.join(",")]);
  const unit = days.find((day) => variables.includes(day.variable))?.unit ?? "";

  return (
    <section className="climate-chart-card">
      <header className="climate-chart-card__header">
        <div>
          <p className="eyebrow">Pronosticado</p>
          <h3 className="title title--section">{title}</h3>
          <small>{caption}</small>
        </div>
      </header>
      {rows.length === 0 || variables.length === 0 ? (
        <Empty message="La fuente aún no entrega esta variable." />
      ) : (
        <ResponsiveContainer height={height} width="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis unit={` ${unit}`} />
            <Tooltip
              formatter={(value, name) => [
                `${formatValue(String(value))} ${unit}`,
                label(String(name))
              ]}
            />
            <Legend formatter={(value) => label(String(value))} />
            {variables.map((variable, index) => (
              <Line
                key={variable}
                dataKey={variable}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2.5}
                type="monotone"
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

function HistoryView({ points, session }: { points: ClimatePoint[]; session: Session }) {
  const [selectedId, setSelectedId] = useState(points[0]?.id ?? "");
  const [history, setHistory] = useState<{
    point: ClimatePoint;
    rows: ClimateReading[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    setHistory(null);
    setError(null);
    void climaService
      .getHistory(session, selectedId)
      .then(setHistory)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "No se pudo cargar el historial."
        )
      );
  }, [selectedId, session]);

  if (error) return <ErrorState description={error} />;

  return (
    <div className="climate-stack">
      <PointSelector points={points} value={selectedId} onChange={setSelectedId} />
      {!history ? (
        <LoadingState description="Cargando lecturas persistidas." />
      ) : (
        <HistoryExplorer history={history} />
      )}
    </div>
  );
}

function HistoryExplorer({
  history
}: {
  history: { point: ClimatePoint; rows: ClimateReading[] };
}) {
  const available = useMemo(
    () =>
      Array.from(new Set(history.rows.map((row) => row.variable))).sort((left, right) =>
        label(left).localeCompare(label(right))
      ),
    [history.rows]
  );
  const [selected, setSelected] = useState(available[0] ?? "");

  useEffect(() => {
    if (available.length && !available.includes(selected)) setSelected(available[0]);
  }, [available.join(","), selected]);

  const rows = useMemo(
    () => mergeHistoryByTimestamp(history.rows, selected ? [selected] : []),
    [history.rows, selected]
  );
  const unit = history.rows.find((row) => row.variable === selected)?.unit ?? "";
  const isAccumulated = selected === "precipitation" || selected === "precipitation_sum";

  return (
    <>
      <section className="climate-chart-card climate-chart-card--featured">
        <header className="climate-chart-card__header">
          <div>
            <p className="eyebrow">Serie histórica · {history.point.name}</p>
            <h3 className="title title--section">
              Evolución de {selected ? label(selected) : "la variable"}
            </h3>
            <small>{rows.length} momentos registrados durante los últimos 30 días.</small>
          </div>
          <label className="field-group">
            <span>Variable</span>
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {available.map((variable) => (
                <option value={variable} key={variable}>
                  {label(variable)}
                </option>
              ))}
            </select>
          </label>
        </header>
        {rows.length === 0 ? (
          <Empty message="Aún no hay una serie para esta variable." />
        ) : (
          <ResponsiveContainer height={390} width="100%">
            {isAccumulated ? (
              <BarChart data={rows} margin={{ left: 4, right: 18, top: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={dateOnly} minTickGap={30} />
                <YAxis unit={` ${unit}`} />
                <Tooltip
                  labelFormatter={(value) => date(String(value))}
                  formatter={(value) => [
                    `${formatValue(String(value))} ${unit}`,
                    label(selected)
                  ]}
                />
                <Bar dataKey={selected} fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={rows} margin={{ left: 4, right: 18, top: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={dateOnly} minTickGap={30} />
                <YAxis unit={` ${unit}`} />
                <Tooltip
                  labelFormatter={(value) => date(String(value))}
                  formatter={(value) => [
                    `${formatValue(String(value))} ${unit}`,
                    label(selected)
                  ]}
                />
                <Line
                  dataKey={selected}
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  type="monotone"
                  dot={rows.length < 20}
                  connectNulls
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </section>
      <details className="climate-traceability">
        <summary>
          <Database aria-hidden="true" size={17} /> Ver trazabilidad tabular
        </summary>
        <ClimateTable
          title="Lecturas persistidas"
          empty="Aún no hay lecturas históricas persistidas."
          headers={["Variable", "Valor", "Tipo", "Fecha del dato", "Modelo"]}
          rows={history.rows.map((row) => [
            label(row.variable),
            `${row.value} ${row.unit}`,
            <Badge key="type" value={row.type} />,
            date(row.dataAt),
            row.model ?? "No informado"
          ])}
        />
      </details>
    </>
  );
}

function StationsView({ items }: { items: Array<Record<string, unknown>> }) {
  return (
    <div className="climate-stack">
      <DistributionChart
        title="Estaciones por estado"
        items={items.map((item) => String(item.estado ?? "SIN CONFIGURAR"))}
      />
      <ClimateTable
        title="Estaciones registradas"
        empty="No hay estaciones registradas."
        headers={["Nombre", "Código", "Tipo", "Estado", "Última comunicación"]}
        rows={items.map((item) => [
          String(item.nombre ?? "-"),
          String(item.codigo ?? "-"),
          String(item.tipo ?? "-"),
          <Badge key="status" value={String(item.estado ?? "SIN CONFIGURAR")} />,
          date(String(item.lastCommunicationAt ?? ""))
        ])}
      />
    </div>
  );
}

function AlertsView({ items }: { items: AlertItem[] }) {
  return (
    <div className="climate-stack">
      <DistributionChart
        title="Alertas por severidad"
        items={items.map((item) => item.severity)}
      />
      <ClimateTable
        title="Eventos detectados"
        empty="No hay alertas registradas."
        headers={["Zona", "Variable", "Valor", "Severidad", "Estado", "Inicio"]}
        rows={items.map((item) => [
          item.pointName,
          label(item.variable),
          `${item.value} ${item.unit}`,
          <Badge key="severity" value={item.severity} />,
          <Badge key="status" value={item.status ?? "ACTIVA"} />,
          date(item.startsAt)
        ])}
      />
    </div>
  );
}

function SourcesView({
  items,
  compact = false
}: {
  items: ClimateSource[];
  compact?: boolean;
}) {
  const table = (
    <ClimateTable
      title={compact ? "Fuentes" : "Salud de las fuentes"}
      empty="No hay fuentes configuradas."
      headers={["Fuente", "Tipo", "Estado", "Última consulta", "Detalle"]}
      rows={items.map((item) => [
        item.nombre,
        item.tipo,
        <Badge key={item.codigo} value={item.estado} />,
        date(item.lastSuccessAt ?? ""),
        item.lastError ?? "Sin incidentes"
      ])}
    />
  );

  if (compact) return table;
  return (
    <div className="climate-stack">
      <DistributionChart
        title="Disponibilidad de proveedores"
        items={items.map((item) => item.estado)}
      />
      {table}
    </div>
  );
}

function MetricChartGrid({
  readings,
  groups,
  compact = false
}: {
  readings: ClimateReading[];
  groups: Array<{ title: string; variables: string[] }>;
  compact?: boolean;
}) {
  const visible = groups
    .map((group) => ({
      ...group,
      readings: group.variables
        .map((variable) => readings.find((reading) => reading.variable === variable))
        .filter((reading): reading is ClimateReading => Boolean(reading))
    }))
    .filter((group) => group.readings.length > 0);

  if (!visible.length)
    return <Empty message="No hay variables disponibles para graficar." />;

  return (
    <div
      className={`climate-metric-charts${compact ? " climate-metric-charts--compact" : ""}`}
    >
      {visible.map((group) => (
        <section
          className="climate-metric-chart"
          key={group.title}
          aria-label={group.title}
        >
          <header>
            <h4>{group.title}</h4>
            <span>{group.readings.length} variables</span>
          </header>
          <div className="climate-bullet-list">
            {group.readings.map((reading) => {
              const width = Math.min(
                100,
                Math.max(
                  3,
                  (Math.abs(Number(reading.value)) / scaleFor(reading.variable)) * 100
                )
              );
              return (
                <div className="climate-bullet" key={reading.variable}>
                  <div className="climate-bullet__label">
                    <span>{label(reading.variable)}</span>
                    <strong>
                      {formatValue(reading.value)} {reading.unit}
                    </strong>
                  </div>
                  <div
                    className="climate-bullet__track"
                    role="img"
                    aria-label={`${label(reading.variable)}: ${formatValue(reading.value)} ${reading.unit}`}
                  >
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function DistributionChart({ title, items }: { title: string; items: string[] }) {
  const data = Array.from(
    items.reduce(
      (counts, item) => counts.set(item, (counts.get(item) ?? 0) + 1),
      new Map<string, number>()
    )
  ).map(([name, value]) => ({ name, value }));

  return (
    <ChartShell title={title} caption={`${items.length} registros clasificados`}>
      {data.length === 0 ? (
        <Empty message="No hay datos para graficar." />
      ) : (
        <ResponsiveContainer height={220} width="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 18, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={110} />
            <Tooltip formatter={(value) => [value, "Registros"]} />
            <Bar dataKey="value" fill="#0f766e" radius={[0, 7, 7, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );
}

function ChartShell({
  title,
  caption,
  children
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className="climate-chart-card">
      <header className="climate-chart-card__header">
        <div>
          <h3 className="title title--section">{title}</h3>
          <small>{caption}</small>
        </div>
      </header>
      {children}
    </section>
  );
}

function PointSelector({
  points,
  value,
  onChange
}: {
  points: ClimatePoint[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-group climate-selector">
      <span>Punto climático</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {points.map((point) => (
          <option key={point.id} value={point.id}>
            {point.name} · {point.district}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClimateTable({
  title,
  headers,
  rows,
  empty
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <section className="climate-table-card">
      <div className="climate-table-card__header">
        <h3 className="title title--section">{title}</h3>
        <span>{rows.length} registros</span>
      </div>
      {rows.length === 0 ? (
        <Empty message={empty ?? "No hay datos disponibles."} />
      ) : (
        <div className="data-table__wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`climate-badge climate-badge--${value.toLowerCase().replaceAll(" ", "-")}`}
    >
      {value}
    </span>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="climate-empty">{message}</p>;
}

function mergeByDate(days: ClimateForecast["days"], variables: string[]) {
  const rows = new Map<string, Record<string, string | number>>();
  for (const day of days) {
    if (!variables.includes(day.variable)) continue;
    const key = day.validAt.slice(0, 10);
    const row = rows.get(key) ?? { date: dateOnly(day.validAt), sortKey: key };
    row[day.variable] = Number(day.value);
    rows.set(key, row);
  }
  return Array.from(rows.values()).sort((left, right) =>
    String(left.sortKey).localeCompare(String(right.sortKey))
  );
}

function scaleFor(variable: string) {
  if (variable.includes("temperature")) return 45;
  if (
    variable.includes("humidity") ||
    variable.includes("probability") ||
    variable === "cloud_cover"
  )
    return 100;
  if (variable === "vapour_pressure_deficit") return 5;
  if (variable.includes("precipitation")) return 50;
  if (variable.includes("wind_direction")) return 360;
  if (variable.includes("wind")) return 80;
  if (variable === "shortwave_radiation") return 1200;
  if (variable === "shortwave_radiation_sum") return 35;
  if (variable === "sunshine_duration") return 14;
  if (variable === "surface_pressure") return 1100;
  if (variable.includes("soil_moisture")) return 0.6;
  if (variable.includes("evapotranspiration")) return 10;
  return 100;
}

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Sin registro"
    : new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(parsed);
}

function dateOnly(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "-"
    : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(parsed);
}

function shortDate(dateKey: string) {
  return dateOnly(`${dateKey}T12:00:00-05:00`);
}

function latestDate(readings: ClimateReading[] | undefined) {
  const latest = readings
    ?.map((reading) => new Date(reading.dataAt))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];
  return latest ? date(latest.toISOString()) : "sin registro";
}

function formatValue(value: number | string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "Sin dato";
}

function label(variable: string) {
  return (
    (
      {
        temperature_2m: "Temperatura",
        apparent_temperature: "Temperatura aparente",
        dew_point_2m: "Punto de rocío",
        temperature_2m_max: "Temperatura máxima",
        temperature_2m_min: "Temperatura mínima",
        relative_humidity_2m: "Humedad relativa",
        vapour_pressure_deficit: "VPD (déficit de presión de vapor)",
        precipitation: "Precipitación",
        precipitation_sum: "Precipitación acumulada",
        precipitation_probability_max: "Probabilidad de lluvia",
        wind_speed_10m: "Viento a 10 m",
        wind_speed_10m_max: "Viento máximo",
        wind_direction_10m: "Dirección del viento",
        wind_gusts_10m: "Ráfagas",
        wind_gusts_10m_max: "Ráfagas máximas",
        shortwave_radiation: "Radiación solar",
        shortwave_radiation_sum: "Radiación acumulada",
        sunshine_duration: "Horas de sol",
        cloud_cover: "Nubosidad",
        surface_pressure: "Presión superficial",
        et0_fao_evapotranspiration: "Evapotranspiración de referencia",
        soil_temperature_0cm: "Temperatura de suelo regional",
        soil_moisture_0_to_1cm: "Humedad de suelo regional"
      } as Record<string, string>
    )[variable] ?? variable.replaceAll("_", " ")
  );
}
