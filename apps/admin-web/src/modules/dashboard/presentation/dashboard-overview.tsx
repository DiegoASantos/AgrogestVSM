"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { isAdminSession } from "../../auth/utils/authorization";
import { dashboardService } from "../services/dashboard.service";
import type { DashboardResumen } from "../types/dashboard.types";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";

import { KpiGrid } from "./kpi-grid";
import { ChartVisitasPorMes } from "./chart-visitas-por-mes";
import { ChartVisitasPorCampania } from "./chart-visitas-por-campania";
import { ChartPlagasFrecuentes } from "./chart-plagas-frecuentes";
import { ChartDeficienciasNutrientes } from "./chart-deficiencias-nutrientes";
import { ActividadReciente } from "./actividad-reciente";

const currentYear = new Date().getFullYear();

export function DashboardOverview() {
  const { session } = useAuthSession();
  const isAdmin = isAdminSession(session);
  const [data, setData] = useState<DashboardResumen | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(currentYear);

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 3; y--) {
      years.push(y);
    }
    return years;
  }, []);

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

  const quickActions = useMemo(() => {
    const allActions = [
      { href: adminRoutes.visitas, label: "Gestionar visitas" },
      { href: adminRoutes.mapas, label: "Abrir mapas" },
      ...(isAdmin
        ? [
            { href: adminRoutes.mantenimiento, label: "Abrir mantenimiento" },
            { href: adminRoutes.seguridad, label: "Abrir seguridad" }
          ]
        : [])
    ];
    return allActions;
  }, [isAdmin]);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState description="Cargando el panel de control..." />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6">
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
    <div className="animate-in fade-in space-y-6 p-6 duration-300">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Panel de control
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AgroGest VSM
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen operativo de visitas, productores y recetas.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
          {quickActions.map((action) => (
            <a
              className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              href={action.href}
              key={action.href}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>

      <KpiGrid
        recetasEmitidas={data.kpis.recetasEmitidas}
        productoresActivos={data.kpis.productoresActivos}
        totalVisitas={data.kpis.totalVisitas}
        visitasEsteMes={data.kpis.visitasEsteMes}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <ChartVisitasPorMes
            availableYears={availableYears}
            data={data.charts.visitasPorMes}
            year={year}
            onYearChange={setYear}
          />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <ChartVisitasPorCampania data={data.charts.visitasPorCampania} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <ChartPlagasFrecuentes data={data.charts.plagasFrecuentes} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <ChartDeficienciasNutrientes data={data.charts.deficienciasNutrientes} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <ActividadReciente
          ultimasRecetas={data.actividadReciente.ultimasRecetas}
          ultimasVisitas={data.actividadReciente.ultimasVisitas}
        />
      </div>
    </div>
  );
}
