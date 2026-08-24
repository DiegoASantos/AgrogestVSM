"use client";

import { LayoutDashboard } from "lucide-react";
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
import { TopProductores } from "./actividad-reciente";
import { ChartVisitasPorAgronomo, currentMonthRange } from "./chart-visitas-por-agronomo";
import { ChartParcelasPorEtapa } from "./chart-parcelas-por-etapa";
import type {
  DashboardDateRange,
  DashboardParcelasPorEtapaFilters,
  EtapaFenologicaDashboardOption,
  ParcelasPorEtapa,
  VisitasPorAgronomo
} from "../types/dashboard.types";

const DASHBOARD_YEAR = 2026;
const chartCardClassName =
  "rounded-lg border border-border/70 bg-card/95 p-4 shadow-sm ring-1 ring-foreground/[0.03] transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-border/80 dark:bg-card dark:ring-white/[0.04] sm:p-5";

export function DashboardOverview() {
  const { session } = useAuthSession();
  const [data, setData] = useState<DashboardResumen | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(DASHBOARD_YEAR);
  const [agronomistFilters, setAgronomistFilters] =
    useState<DashboardDateRange>(currentMonthRange);
  const [stageFilters, setStageFilters] = useState<DashboardParcelasPorEtapaFilters>(
    () => ({ ...currentMonthRange(), phenologicalStageId: "" })
  );
  const [visitasPorAgronomo, setVisitasPorAgronomo] = useState<VisitasPorAgronomo[]>([]);
  const [parcelasPorEtapa, setParcelasPorEtapa] = useState<ParcelasPorEtapa[]>([]);
  const [etapas, setEtapas] = useState<EtapaFenologicaDashboardOption[]>([]);
  const [isLoadingAgronomists, setIsLoadingAgronomists] = useState(true);
  const [isLoadingStages, setIsLoadingStages] = useState(true);
  const [agronomistsError, setAgronomistsError] = useState<string | null>(null);
  const [stagesError, setStagesError] = useState<string | null>(null);

  const loadData = useCallback(
    async (y: number) => {
      if (!session) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const resumen = await dashboardService.getResumen(session, y);
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
    void loadData(year);
  }, [loadData, year]);

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
              onClick={() => void loadData(year)}
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className={`${chartCardClassName} md:col-span-2 xl:col-span-1`}>
          <ChartVisitasPorMes
            availableYears={[DASHBOARD_YEAR]}
            data={data.charts.visitasPorMes}
            year={year}
            onYearChange={setYear}
          />
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
            etapas={etapas}
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

  async function loadParcelasPorEtapa(filters: DashboardParcelasPorEtapaFilters) {
    if (!session) return;

    try {
      setIsLoadingStages(true);
      setStagesError(null);
      const response = await dashboardService.getParcelasPorEtapa(session, filters);
      setParcelasPorEtapa(response.items);
      setEtapas(response.etapas);
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
