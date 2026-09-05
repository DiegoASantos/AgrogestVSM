"use client";

import { CalendarDays, Filter, LayoutDashboard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { dashboardService } from "../services/dashboard.service";
import type { DashboardResumen } from "../types/dashboard.types";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { toApiError } from "../../../shared/services";

import { KpiGrid } from "./kpi-grid";
import { ChartVisitasPorMes } from "./chart-visitas-por-mes";
import { ChartVisitasPorCampania } from "./chart-visitas-por-campania";
import { ChartPlagasFrecuentes } from "./chart-plagas-frecuentes";
import { ChartDeficienciasNutrientes } from "./chart-deficiencias-nutrientes";
import { ChartEnfermedadesFrecuentes } from "./chart-enfermedades-frecuentes";
import { TopProductores } from "./actividad-reciente";
import { ChartVisitasPorAgronomo, currentMonthRange } from "./chart-visitas-por-agronomo";
import { ChartParcelasPorEtapa } from "./chart-parcelas-por-etapa";
import type {
  DashboardDateRange,
  DashboardPeriodFilters,
  ParcelasPorEtapa,
  VisitasPorAgronomo
} from "../types/dashboard.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
const chartCardClassName =
  "rounded-lg border border-border/70 bg-card/95 p-4 shadow-sm ring-1 ring-foreground/[0.03] transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-border/80 dark:bg-card dark:ring-white/[0.04] sm:p-5";

export function DashboardOverview() {
  const { session } = useAuthSession();
  const [data, setData] = useState<DashboardResumen | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriodFilters>(
    currentDashboardPeriod
  );
  const [agronomistFilters, setAgronomistFilters] =
    useState<DashboardDateRange>(currentMonthRange);
  const [stageFilters, setStageFilters] = useState<DashboardDateRange>(currentMonthRange);
  const [visitasPorAgronomo, setVisitasPorAgronomo] = useState<VisitasPorAgronomo[]>([]);
  const [parcelasPorEtapa, setParcelasPorEtapa] = useState<ParcelasPorEtapa[]>([]);
  const [isLoadingAgronomists, setIsLoadingAgronomists] = useState(true);
  const [isLoadingStages, setIsLoadingStages] = useState(true);
  const [agronomistsError, setAgronomistsError] = useState<string | null>(null);
  const [stagesError, setStagesError] = useState<string | null>(null);

  const loadData = useCallback(
    async (filters: DashboardPeriodFilters) => {
      if (!session) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const resumen = await dashboardService.getResumen(session, filters);
        setData(resumen);
      } catch (err) {
        const apiError = toApiError(err);
        if (apiError.statusCode === 401) return;
        setErrorMessage(apiError.message || "No se pudo cargar el panel.");
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  useEffect(() => {
    void loadData(dashboardPeriod);
  }, [dashboardPeriod, loadData]);

  useEffect(() => {
    if (!session) return;

    void loadVisitasPorAgronomo(agronomistFilters);
  }, [agronomistFilters, session]);

  useEffect(() => {
    if (!session) return;

    void loadParcelasPorEtapa(stageFilters);
  }, [session, stageFilters]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState description="Cargando el panel de control..." />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          action={
            <button
              className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => void loadData(dashboardPeriod)}
              type="button"
            >
              Reintentar
            </button>
          }
          description={errorMessage}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="animate-in fade-in space-y-6 p-4 duration-300 sm:p-6">
      <section className="overflow-hidden rounded-lg border border-primary/10 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--background))_45%,hsl(var(--chart-2)/0.10))] p-5 shadow-sm dark:border-primary/20 dark:bg-[linear-gradient(135deg,hsl(var(--primary)/0.20),hsl(var(--card))_48%,hsl(var(--chart-2)/0.16))] sm:p-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary shadow-sm dark:border-primary/25 dark:bg-card/80 dark:text-primary">
            <LayoutDashboard className="size-3.5" />
            Panel de control
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            AgroGest VSM
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Resumen operativo para detectar actividad reciente, campanias activas y
            alertas sanitarias o nutricionales desde un solo tablero.
          </p>
        </div>
      </section>

      <KpiGrid
        cumplimientoPromedio={data.kpis.cumplimientoPromedio}
        recetasEmitidas={data.kpis.recetasEmitidas}
        productoresActivos={data.kpis.productoresActivos}
        totalVisitas={data.kpis.totalVisitas}
        visitasEsteMes={data.kpis.visitasEsteMes}
      />

      <DashboardPeriodFilter
        filters={dashboardPeriod}
        onApply={setDashboardPeriod}
        years={data.availableYears}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className={`${chartCardClassName} md:col-span-2 xl:col-span-1`}>
          <ChartVisitasPorMes data={data.charts.visitasPorMes} />
        </div>
        <div className={chartCardClassName}>
          <ChartVisitasPorCampania data={data.charts.visitasPorCampania} />
        </div>
        <div className={chartCardClassName}>
          <ChartPlagasFrecuentes data={data.charts.plagasFrecuentes} />
        </div>
        <div className={chartCardClassName}>
          <ChartDeficienciasNutrientes data={data.charts.deficienciasNutrientes} />
        </div>
        <div className={chartCardClassName}>
          <ChartEnfermedadesFrecuentes data={data.charts.enfermedadesFrecuentes} />
        </div>
        <div className={chartCardClassName}>
          <ChartVisitasPorAgronomo
            data={visitasPorAgronomo}
            errorMessage={agronomistsError}
            isLoading={isLoadingAgronomists}
            onApply={setAgronomistFilters}
            range={agronomistFilters}
          />
        </div>
        <div className={chartCardClassName}>
          <ChartParcelasPorEtapa
            data={parcelasPorEtapa}
            errorMessage={stagesError}
            filters={stageFilters}
            isLoading={isLoadingStages}
            onApply={setStageFilters}
          />
        </div>
      </div>

      <div className={chartCardClassName}>
        <TopProductores
          campaniaActual={data.rankingProductores.campaniaActual}
          general={data.rankingProductores.general}
        />
      </div>
    </div>
  );

  async function loadVisitasPorAgronomo(filters: DashboardDateRange) {
    if (!session) return;

    try {
      setIsLoadingAgronomists(true);
      setAgronomistsError(null);
      const response = await dashboardService.getVisitasPorAgronomo(session, filters);
      setVisitasPorAgronomo(response.items);
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.statusCode !== 401) {
        setAgronomistsError(
          apiError.message || "No se pudo cargar las visitas por agrónomo."
        );
      }
    } finally {
      setIsLoadingAgronomists(false);
    }
  }

  async function loadParcelasPorEtapa(filters: DashboardDateRange) {
    if (!session) return;

    try {
      setIsLoadingStages(true);
      setStagesError(null);
      const response = await dashboardService.getParcelasPorEtapa(session, filters);
      setParcelasPorEtapa(response.items);
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.statusCode !== 401) {
        setStagesError(apiError.message || "No se pudo cargar las parcelas por etapa.");
      }
    } finally {
      setIsLoadingStages(false);
    }
  }
}

function currentDashboardPeriod(): DashboardPeriodFilters {
  return { year: new Date().getFullYear(), month: null, day: null };
}

function DashboardPeriodFilter({
  filters,
  onApply,
  years
}: {
  filters: DashboardPeriodFilters;
  onApply: (filters: DashboardPeriodFilters) => void;
  years: number[];
}) {
  const [draft, setDraft] = useState(filters);
  const availableYears = Array.from(new Set([filters.year, ...years])).sort(
    (left, right) => right - left
  );
  const daysInMonth = draft.month
    ? new Date(draft.year, draft.month, 0).getDate()
    : 0;

  useEffect(() => setDraft(filters), [filters]);

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-lg border border-border/70 bg-card/95 p-4 shadow-sm dark:border-border/80 dark:bg-card">
      <div className="mr-auto flex items-center gap-2 pb-1 text-sm font-semibold text-foreground">
        <CalendarDays className="size-4 text-primary" />
        Periodo de gráficos
      </div>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Año
        <Select
          onValueChange={(value) =>
            setDraft((current) => ({ ...current, year: Number(value), day: null }))
          }
          value={String(draft.year)}
        >
          <SelectTrigger className="h-9 w-[110px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Mes
        <Select
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              month: value === "all" ? null : Number(value),
              day: null
            }))
          }
          value={draft.month === null ? "all" : String(draft.month)}
        >
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {MONTHS.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Día
        <Select
          disabled={draft.month === null}
          onValueChange={(value) =>
            setDraft((current) => ({ ...current, day: value === "all" ? null : Number(value) }))
          }
          value={draft.day === null ? "all" : String(draft.day)}
        >
          <SelectTrigger className="h-9 w-[105px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <SelectItem key={day} value={String(day)}>{day}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <button className="ui-button ui-button--ghost ui-button--compact" onClick={() => onApply(currentDashboardPeriod())} type="button">
        Limpiar
      </button>
      <button className="ui-button ui-button--primary ui-button--compact" onClick={() => onApply(draft)} type="button">
        <Filter size={14} /> Aplicar
      </button>
    </section>
  );
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
