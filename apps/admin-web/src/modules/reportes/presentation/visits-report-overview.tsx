"use client";

import {
  Activity,
  CalendarRange,
  ChartNoAxesCombined,
  Filter,
  MapPinned,
  Ruler,
  TableProperties,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import type { ParcelaListItem } from "../../parcelas/types/parcelas.types";
import { AdminMap } from "../../../shared/components/admin-map";
import type {
  AdminMapPoint,
  AdminMapPolygon
} from "../../../shared/components/admin-map";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import { TableSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { buildProductorLabel, reportesService } from "../services/reportes.service";
import type {
  VisitReportFilters,
  VisitsReportCatalogs,
  VisitsReportData
} from "../types/reportes.types";
import {
  currentMonthReportFilters,
  filterAssignedReportParcelas,
  resolveReportParcelaGeodata
} from "../utils/reportes-visitas";
import { VisitsHectaresChart } from "./visits-hectares-chart";

const emptyReport: VisitsReportData = { summary: [], timeline: [] };

export function VisitsReportOverview() {
  const { session, logout } = useAuthSession();
  const [draftFilters, setDraftFilters] = useState<VisitReportFilters>(() =>
    currentMonthReportFilters()
  );
  const [appliedFilters, setAppliedFilters] = useState<VisitReportFilters>(() =>
    currentMonthReportFilters()
  );
  const [catalogs, setCatalogs] = useState<VisitsReportCatalogs | null>(null);
  const [report, setReport] = useState<VisitsReportData>(emptyReport);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(true);

  useEffect(() => {
    if (session) {
      void loadCatalogs();
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      void loadReport(appliedFilters);
    }
  }, [appliedFilters, session]);

  const agronomistOptions = useMemo(
    () =>
      (catalogs?.agronomists ?? []).map((agronomist) => ({
        value: agronomist.id,
        label: agronomist.displayName
      })),
    [catalogs?.agronomists]
  );
  const productorOptions = useMemo(
    () =>
      (catalogs?.productores ?? []).map((productor) => ({
        value: productor.id,
        label: buildProductorLabel(productor),
        helper: productor.documentNumber ?? undefined
      })),
    [catalogs?.productores]
  );
  const mapData = useMemo(
    () => buildReportMapData(catalogs?.parcelas ?? [], catalogs, appliedFilters),
    [appliedFilters, catalogs]
  );
  const reportMetrics = useMemo(() => buildReportMetrics(report), [report]);

  return (
    <section className="panel-grid report-visits">
      <article className="panel report-visits__hero">
        <ToolbarActions
          description="Consulta la actividad de campo por ingeniero, productor y rango de fechas."
          eyebrow="Reportes"
          title="Reporte de visitas"
        />

        <div className="filter-card report-visits__filters">
          <div className="filter-card__header">
            <Filter size={16} />
            <span>Filtros del reporte</span>
          </div>
          <div className="filter-card__body">
            <SearchableSelect
              disabled={isLoadingCatalogs}
              emptyMessage="No hay ingenieros activos."
              label="Ingeniero"
              onChange={(value) => updateDraft("agronomistUserId", value)}
              options={agronomistOptions}
              placeholder="Todos · escribe para buscar"
              value={draftFilters.agronomistUserId}
            />
            <SearchableSelect
              disabled={isLoadingCatalogs}
              emptyMessage="No hay productores activos."
              label="Productor"
              onChange={(value) => updateDraft("productorId", value)}
              options={productorOptions}
              placeholder="Todos · escribe para buscar"
              value={draftFilters.productorId}
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
              onClick={handleClearFilters}
              type="button"
            >
              Restablecer mes
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
                Reintentar catálogos
              </button>
            }
            description={catalogError}
            title="No se pudieron cargar los filtros y el mapa"
          />
        ) : null}
        {isLoadingCatalogs ? (
          <LoadingState description="Cargando ingenieros, productores y parcelas asignadas." />
        ) : null}

        <div aria-label="Indicadores del reporte" className="report-metrics" role="group">
          <ReportMetric
            icon={<Activity size={19} />}
            label="Visitas registradas"
            status={reportError ? "No disponible" : isLoadingReport ? "Cargando" : null}
            value={formatInteger(reportMetrics.totalVisits)}
          />
          <ReportMetric
            icon={<UsersRound size={19} />}
            label="Ingenieros con actividad"
            status={reportError ? "No disponible" : isLoadingReport ? "Cargando" : null}
            value={formatInteger(reportMetrics.activeEngineers)}
          />
          <ReportMetric
            icon={<Ruler size={19} />}
            label="Hectáreas observadas acumuladas"
            status={reportError ? "No disponible" : isLoadingReport ? "Cargando" : null}
            value={`${formatHectares(reportMetrics.totalHectares)} ha`}
          />
          <ReportMetric
            icon={<MapPinned size={19} />}
            label="Parcelas asignadas"
            status={
              catalogError ? "No disponible" : isLoadingCatalogs ? "Cargando" : null
            }
            value={formatInteger(mapData.assignedCount)}
          />
        </div>
      </article>

      <article className="panel report-section report-section--summary">
        <ReportSectionHeader
          description="Cada día se cuenta una sola vez por ingeniero, aunque registre varias visitas."
          icon={<TableProperties size={18} />}
          title="Resumen de visitas"
        />
        {reportError ? (
          <ReportError
            message={reportError}
            onRetry={() => void loadReport(appliedFilters)}
          />
        ) : null}
        {!reportError && isLoadingReport ? (
          <TableSkeleton
            columns={4}
            description="Calculando visitas, días de campo y promedios."
          />
        ) : null}
        {!reportError && !isLoadingReport && report.summary.length === 0 ? (
          <EmptyState
            description="No hay ingenieros activos que coincidan con los filtros seleccionados."
            title="Sin filas para mostrar"
          />
        ) : null}
        {!reportError && !isLoadingReport && report.summary.length > 0 ? (
          <div className="data-table__wrapper">
            <table className="data-table report-summary-table">
              <caption>Resumen de visitas por ingeniero</caption>
              <thead>
                <tr>
                  <th>Ingeniero</th>
                  <th>Visitas registradas</th>
                  <th>Días de visita</th>
                  <th>Promedio diario</th>
                </tr>
              </thead>
              <tbody>
                {report.summary.map((row) => (
                  <tr key={row.agronomistUserId}>
                    <td>{row.engineerName}</td>
                    <td className="report-summary-table__number">{row.visitsCount}</td>
                    <td className="report-summary-table__number">{row.visitDays}</td>
                    <td className="report-summary-table__number">
                      {formatAverage(row.dailyAverage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      <div className="report-visual-grid">
        <article className="panel report-section report-section--map">
          <ReportSectionHeader
            description={`${mapData.assignedCount} parcelas asignadas · ${mapData.missingGeodataCount} sin geodatos`}
            icon={<MapPinned size={18} />}
            title="Parcelas por ingeniero"
          />
          {catalogError || isLoadingCatalogs ? null : (
            <AdminMap
              emptyMessage="No hay parcelas asignadas con geodatos para estos filtros."
              minHeight={390}
              points={mapData.points}
              polygons={mapData.polygons}
            />
          )}
        </article>

        <article className="panel report-section report-section--chart">
          <ReportSectionHeader
            description="Las barras suman el área observada y la línea cuenta visitas activas por día."
            icon={<ChartNoAxesCombined size={18} />}
            title="Hectáreas y visitas"
          />
          {reportError ? (
            <ReportError
              message={reportError}
              onRetry={() => void loadReport(appliedFilters)}
            />
          ) : null}
          {!reportError && isLoadingReport ? (
            <LoadingState description="Preparando la serie diaria del reporte." />
          ) : null}
          {!reportError && !isLoadingReport && report.timeline.length === 0 ? (
            <EmptyState
              description="No hay visitas activas dentro del rango seleccionado."
              title="Sin datos para graficar"
            />
          ) : null}
          {!reportError && !isLoadingReport && report.timeline.length > 0 ? (
            <VisitsHectaresChart data={report.timeline} />
          ) : null}
        </article>
      </div>
    </section>
  );

  function updateDraft(key: keyof VisitReportFilters, value: string) {
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

    setValidationError(null);
    setAppliedFilters(draftFilters);
  }

  function handleClearFilters() {
    const initialFilters = currentMonthReportFilters();
    setValidationError(null);
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  async function loadCatalogs() {
    if (!session) {
      return;
    }

    try {
      setIsLoadingCatalogs(true);
      setCatalogError(null);
      setCatalogs(await reportesService.getVisitsCatalogs(session));
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

  async function loadReport(filters: VisitReportFilters) {
    if (!session) {
      return;
    }

    try {
      setIsLoadingReport(true);
      setReportError(null);
      setReport(await reportesService.getVisitsReport(session, filters));
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.statusCode === 401) {
        logout();
        return;
      }
      setReportError(apiError.message);
    } finally {
      setIsLoadingReport(false);
    }
  }
}

function ReportMetric({
  icon,
  label,
  value,
  status
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status: string | null;
}) {
  return (
    <div aria-busy={status === "Cargando"} className="report-metric">
      <span className="report-metric__icon">{icon}</span>
      <span className="report-metric__copy">
        <strong>
          {status ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">{status}</span>
            </>
          ) : (
            value
          )}
        </strong>
        <span>{label}</span>
      </span>
    </div>
  );
}

function ReportSectionHeader({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: ReactNode;
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

function buildReportMapData(
  parcelas: ParcelaListItem[],
  catalogs: VisitsReportCatalogs | null,
  filters: VisitReportFilters
) {
  const assignedParcelas = filterAssignedReportParcelas(parcelas, filters);
  const agronomistsById = new Map(
    (catalogs?.agronomists ?? []).map((item) => [item.id, item.displayName])
  );
  const productoresById = new Map(
    (catalogs?.productores ?? []).map((item) => [item.id, buildProductorLabel(item)])
  );
  const polygons: AdminMapPolygon[] = [];
  const points: AdminMapPoint[] = [];
  let missingGeodataCount = 0;

  for (const parcela of assignedParcelas) {
    const { geometry, point } = resolveReportParcelaGeodata(parcela);
    const popup = {
      title: parcela.name || parcela.code,
      description: [
        `Código: ${parcela.code}`,
        `Ingeniero: ${agronomistsById.get(parcela.agronomoUsuarioId ?? "") ?? "No disponible"}`,
        `Productor: ${productoresById.get(parcela.productorId) ?? "No disponible"}`,
        parcela.areaHectares ? `Área: ${parcela.areaHectares} ha` : null
      ]
        .filter(Boolean)
        .join(" · ")
    };

    if (geometry) {
      polygons.push({ id: `parcela-${parcela.id}`, geometry, popup });
    } else if (point) {
      points.push({ id: `parcela-${parcela.id}`, geometry: point, popup });
    } else {
      missingGeodataCount += 1;
    }
  }

  return {
    assignedCount: assignedParcelas.length,
    missingGeodataCount,
    points,
    polygons
  };
}

function formatAverage(value: number) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function buildReportMetrics(report: VisitsReportData) {
  return {
    totalVisits: report.summary.reduce((total, item) => total + item.visitsCount, 0),
    activeEngineers: report.summary.filter((item) => item.visitsCount > 0).length,
    totalHectares: report.timeline.reduce((total, item) => total + item.hectares, 0)
  };
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
}

function formatHectares(value: number) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}
