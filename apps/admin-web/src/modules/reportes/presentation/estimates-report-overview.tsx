"use client";

import {
  CalendarRange,
  ChartNoAxesCombined,
  Filter,
  TableProperties
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import { TableSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { reportesService } from "../services/reportes.service";
import type {
  EstimateReportFilters,
  EstimatesReportCatalogs,
  EstimatesReportData
} from "../types/reportes.types";
import {
  currentYearEstimateReportFilters,
  formatReportDate,
  formatVariation,
  normalizeEstimateReportRange,
  variationTone
} from "../utils/reportes-estimaciones";
import { EstimatesWeeklyChart } from "./estimates-weekly-chart";

const emptyReport: EstimatesReportData = {
  range: { startDate: "", endDate: "" },
  weeks: []
};

export function EstimatesReportOverview() {
  const { session, logout } = useAuthSession();
  const [draftFilters, setDraftFilters] = useState<EstimateReportFilters>(() =>
    currentYearEstimateReportFilters()
  );
  const [appliedFilters, setAppliedFilters] = useState<EstimateReportFilters>(() =>
    currentYearEstimateReportFilters()
  );
  const [catalogs, setCatalogs] = useState<EstimatesReportCatalogs | null>(null);
  const [report, setReport] = useState<EstimatesReportData>(emptyReport);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(true);

  useEffect(() => {
    if (session) void loadCatalogs();
  }, [session]);

  useEffect(() => {
    if (session) void loadReport(appliedFilters);
  }, [appliedFilters, session]);

  const agronomistOptions = useMemo(
    () =>
      (catalogs?.agronomists ?? []).map((agronomist) => ({
        value: agronomist.id,
        label: agronomist.displayName
      })),
    [catalogs?.agronomists]
  );
  const tableWeeks = useMemo(() => [...report.weeks].reverse(), [report.weeks]);
  const hasActivity = report.weeks.some(
    (week) => week.projectedVisits > 0 || week.actualVisits > 0
  );

  return (
    <section className="panel-grid report-visits estimates-report">
      <article className="panel report-visits__hero estimates-report__hero">
        <ToolbarActions
          description="Compara la planificación de visitas con la ejecución real a través de semanas completas."
          eyebrow="Reportes"
          title="Reporte de estimaciones"
        />

        <div className="filter-card report-visits__filters estimates-report__filters">
          <div className="filter-card__header">
            <Filter size={16} />
            <span>Filtros del reporte</span>
          </div>
          <div className="filter-card__body">
            <SearchableSelect
              disabled={isLoadingCatalogs}
              emptyMessage="No hay agrónomos activos."
              label="Agrónomo"
              onChange={(value) => updateDraft("agronomistUserId", value)}
              options={agronomistOptions}
              placeholder="Todos · escribe para buscar"
              value={draftFilters.agronomistUserId}
            />
            <label className="field-group">
              <span className="field-group__label">
                <CalendarRange size={13} />
                Fecha desde
              </span>
              <input
                onChange={(event) => updateDraft("startDate", event.target.value)}
                type="date"
                value={draftFilters.startDate}
              />
            </label>
            <label className="field-group">
              <span className="field-group__label">
                <CalendarRange size={13} />
                Fecha hasta
              </span>
              <input
                onChange={(event) => updateDraft("endDate", event.target.value)}
                type="date"
                value={draftFilters.endDate}
              />
            </label>
          </div>
          {validationError ? <p className="form-error">{validationError}</p> : null}
          <div className="filter-card__footer">
            <button
              className="ui-button ui-button--ghost ui-button--compact"
              onClick={handleResetFilters}
              type="button"
            >
              Restablecer año
            </button>
            <button
              className="ui-button ui-button--primary"
              onClick={handleApplyFilters}
              type="button"
            >
              Aplicar filtros
            </button>
          </div>
        </div>

        {catalogError ? (
          <ErrorState
            action={
              <button
                className="ui-button ui-button--secondary"
                onClick={() => void loadCatalogs()}
                type="button"
              >
                Reintentar catálogo
              </button>
            }
            description={catalogError}
            title="No se pudo cargar el filtro de agrónomos"
          />
        ) : null}
      </article>

      <article className="panel report-section report-section--chart estimates-report__chart">
        <ReportSectionHeader
          description="La línea discontinua representa la planificación y la línea continua la ejecución real."
          icon={<ChartNoAxesCombined size={18} />}
          title="Proyección y ejecución por semana"
        />
        {reportError ? (
          <ReportError
            message={reportError}
            onRetry={() => void loadReport(appliedFilters)}
          />
        ) : null}
        {!reportError && isLoadingReport ? (
          <LoadingState description="Preparando la serie semanal del reporte." />
        ) : null}
        {!reportError && !isLoadingReport && report.weeks.length > 0 ? (
          <>
            {!hasActivity ? (
              <p className="estimates-report__empty-note" role="status">
                No hay visitas proyectadas ni ejecutadas en el rango; se muestran las
                semanas con valor cero.
              </p>
            ) : null}
            <EstimatesWeeklyChart data={report.weeks} />
          </>
        ) : null}
      </article>

      <article className="panel report-section estimates-report__table-section">
        <ReportSectionHeader
          description={
            report.range.startDate
              ? `${formatReportDate(report.range.startDate)} al ${formatReportDate(report.range.endDate)}`
              : "El rango aplicado se mostrará aquí."
          }
          icon={<TableProperties size={18} />}
          title="Detalle semanal"
        />
        {reportError ? null : isLoadingReport ? (
          <TableSkeleton columns={6} description="Cargando el detalle por semana." />
        ) : (
          <div className="data-table__wrapper">
            <table className="data-table report-summary-table estimates-report__table">
              <caption>Comparación semanal de visitas proyectadas y ejecutadas</caption>
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Fecha de inicio</th>
                  <th>Fecha de fin</th>
                  <th>Visitas reales</th>
                  <th>Visitas proyectadas</th>
                  <th>Variación</th>
                </tr>
              </thead>
              <tbody>
                {tableWeeks.map((week) => {
                  const tone = variationTone(week.variationPercentage);
                  return (
                    <tr key={week.startDate}>
                      <td>{`S${week.weekNumber} · ${week.isoYear}`}</td>
                      <td>{formatReportDate(week.startDate)}</td>
                      <td>{formatReportDate(week.endDate)}</td>
                      <td className="report-summary-table__number">
                        {week.actualVisits}
                      </td>
                      <td className="report-summary-table__number">
                        {week.projectedVisits}
                      </td>
                      <td className="report-summary-table__number">
                        <span
                          className={`estimates-report__variation estimates-report__variation--${tone}`}
                        >
                          {formatVariation(week.variationPercentage)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );

  function updateDraft(key: keyof EstimateReportFilters, value: string) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function handleApplyFilters() {
    if (!draftFilters.startDate || !draftFilters.endDate) {
      setValidationError("Selecciona la fecha desde y la fecha hasta.");
      return;
    }
    if (draftFilters.startDate > draftFilters.endDate) {
      setValidationError("La fecha hasta debe ser mayor o igual a la fecha desde.");
      return;
    }

    const range = normalizeEstimateReportRange(
      draftFilters.startDate,
      draftFilters.endDate
    );
    const filters = { ...draftFilters, ...range };
    setValidationError(null);
    setDraftFilters(filters);
    setAppliedFilters(filters);
  }

  function handleResetFilters() {
    const filters = currentYearEstimateReportFilters();
    setValidationError(null);
    setDraftFilters(filters);
    setAppliedFilters(filters);
  }

  async function loadCatalogs() {
    if (!session) return;
    try {
      setIsLoadingCatalogs(true);
      setCatalogError(null);
      setCatalogs(await reportesService.getEstimatesReportCatalogs(session));
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.statusCode === 401) {
        logout();
        return;
      }
      setCatalogError(apiError.message);
    } finally {
      setIsLoadingCatalogs(false);
    }
  }

  async function loadReport(filters: EstimateReportFilters) {
    if (!session) return;
    try {
      setIsLoadingReport(true);
      setReportError(null);
      setReport(await reportesService.getEstimatesReport(session, filters));
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.statusCode === 401) {
        logout();
        return;
      }
      setReportError(apiError.message);
      setReport(emptyReport);
    } finally {
      setIsLoadingReport(false);
    }
  }
}

function ReportSectionHeader({
  description,
  icon,
  title
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <header className="report-section__header">
      <div className="report-section__title">
        <span className="report-section__icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
    </header>
  );
}

function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <ErrorState
      action={
        <button
          className="ui-button ui-button--secondary"
          onClick={onRetry}
          type="button"
        >
          Reintentar reporte
        </button>
      }
      description={message}
      title="No se pudo cargar el reporte"
    />
  );
}
