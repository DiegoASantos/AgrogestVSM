"use client";

import {
  ChartPie,
  CalendarRange,
  Filter,
  LandPlot,
  MapPinned,
  Ruler,
  TableProperties
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { AdminMap } from "../../../shared/components/admin-map";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { buildProductorLabel, reportesService } from "../services/reportes.service";
import type {
  ParcelsReportCatalogs,
  ParcelsReportData,
  ParcelsReportFilters
} from "../types/reportes.types";
import {
  buildParcelsReportMapData,
  currentMonthParcelsReportFilters,
  PARCEL_CATEGORY_COLORS
} from "../utils/reportes-parcelas";
import { ParcelCategoryPieChart } from "./parcel-category-pie-chart";

const emptyReport: ParcelsReportData = {
  totals: {
    parcels: 0,
    hectares: 0,
    averageHectaresPerParcel: 0,
    categorizedParcels: 0,
    uncategorizedParcels: 0,
    categorizedWithoutGeodata: 0
  },
  summary: [],
  distribution: [],
  parcels: []
};

export function ParcelsReportOverview() {
  const { session, logout } = useAuthSession();
  const [draftFilters, setDraftFilters] = useState<ParcelsReportFilters>({
    ...currentMonthParcelsReportFilters()
  });
  const [appliedFilters, setAppliedFilters] = useState<ParcelsReportFilters>({
    ...currentMonthParcelsReportFilters()
  });
  const [catalogs, setCatalogs] = useState<ParcelsReportCatalogs | null>(null);
  const [report, setReport] = useState<ParcelsReportData>(emptyReport);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (session) void loadCatalogs();
  }, [session]);

  useEffect(() => {
    if (session) void loadReport(appliedFilters);
  }, [appliedFilters, session]);

  const agronomistOptions = useMemo(
    () =>
      (catalogs?.agronomists ?? []).map((item) => ({
        value: item.id,
        label: item.displayName
      })),
    [catalogs?.agronomists]
  );
  const productorOptions = useMemo(
    () =>
      (catalogs?.productores ?? []).map((item) => ({
        value: item.id,
        label: buildProductorLabel(item),
        helper: item.documentNumber ?? undefined
      })),
    [catalogs?.productores]
  );
  const sectorOptions = useMemo(
    () =>
      (catalogs?.sectores ?? []).map((item) => ({
        value: item.id,
        label: item.name,
        helper: item.isActive ? "Activo" : "Inactivo"
      })),
    [catalogs?.sectores]
  );
  const filteredSubsectores = useMemo(
    () =>
      (catalogs?.subsectores ?? []).filter(
        (item) => !draftFilters.sectorId || item.sectorId === draftFilters.sectorId
      ),
    [catalogs?.subsectores, draftFilters.sectorId]
  );
  const subsectorOptions = useMemo(
    () =>
      filteredSubsectores.map((item) => ({
        value: item.id,
        label: item.name,
        helper: item.isActive ? "Activo" : "Inactivo"
      })),
    [filteredSubsectores]
  );
  const mapData = useMemo(() => buildParcelsReportMapData(report), [report]);

  return (
    <section className="panel-grid report-visits parcel-report">
      <article className="panel report-visits__hero">
        <ToolbarActions
          description="Superficie, asignación actual y distribución territorial de las parcelas."
          eyebrow="Reportes"
          title="Parcelas"
        />

        <div className="filter-card report-visits__filters parcel-report__filters">
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
              emptyMessage="No hay productores."
              label="Productor"
              onChange={(value) => updateDraft("productorId", value)}
              options={productorOptions}
              placeholder="Todos · escribe para buscar"
              value={draftFilters.productorId}
            />
            <SearchableSelect
              disabled={isLoadingCatalogs}
              emptyMessage="No hay sectores."
              label="Sector"
              onChange={handleSectorChange}
              options={sectorOptions}
              placeholder="Todos · escribe para buscar"
              value={draftFilters.sectorId}
            />
            <SearchableSelect
              disabled={isLoadingCatalogs}
              emptyMessage="No hay subsectores para el sector."
              label="Subsector"
              onChange={(value) => updateDraft("subsectorId", value)}
              options={subsectorOptions}
              placeholder="Todos · escribe para buscar"
              value={draftFilters.subsectorId}
            />
            <label className="field-group">
              <span className="field-group__label">Estado de la parcela</span>
              <select
                onChange={(event) =>
                  updateDraft(
                    "status",
                    event.target.value as ParcelsReportFilters["status"]
                  )
                }
                value={draftFilters.status}
              >
                <option value="">Todas</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </label>
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
              Limpiar filtros
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
            title="No se pudieron cargar los filtros"
          />
        ) : null}

        <div aria-label="Indicadores del reporte" className="report-metrics" role="group">
          <ReportMetric
            icon={<LandPlot size={19} />}
            label="Parcelas filtradas"
            status={metricStatus()}
            value={formatInteger(report.totals.parcels)}
          />
          <ReportMetric
            icon={<Ruler size={19} />}
            label="Hectáreas registradas"
            status={metricStatus()}
            value={`${formatNumber(report.totals.hectares)} ha`}
          />
          <ReportMetric
            icon={<ChartPie size={19} />}
            label="Parcelas categorizadas"
            status={metricStatus()}
            value={formatInteger(report.totals.categorizedParcels)}
          />
          <ReportMetric
            icon={<MapPinned size={19} />}
            label="Sin área / sin geodatos"
            status={metricStatus()}
            value={`${report.totals.uncategorizedParcels} / ${report.totals.categorizedWithoutGeodata}`}
          />
        </div>
      </article>

      {reportError ? (
        <ErrorState
          action={
            <button
              className="ui-button ui-button--secondary"
              onClick={() => void loadReport(appliedFilters)}
              type="button"
            >
              Reintentar reporte
            </button>
          }
          description={reportError}
          title="No se pudo cargar el reporte"
        />
      ) : null}
      {!reportError && isLoadingReport ? (
        <LoadingState description="Clasificando parcelas y calculando superficies." />
      ) : null}
      {!reportError && !isLoadingReport && report.totals.parcels === 0 ? (
        <EmptyState
          description="Cambia los filtros para consultar otro conjunto de parcelas."
          title="No hay parcelas para mostrar"
        />
      ) : null}

      {!reportError && !isLoadingReport && report.totals.parcels > 0 ? (
        <div className="parcel-report__dashboard">
          <article className="panel report-section parcel-report__summary">
            <ReportSectionHeader
              description="La media divide las hectáreas registradas entre las parcelas asignadas."
              icon={<TableProperties size={18} />}
              title="Resumen por ingeniero"
            />
            <ParcelsSummaryTable report={report} />
          </article>

          <article className="panel report-section parcel-report__parcel-chart">
            <ReportSectionHeader
              description={`${report.totals.categorizedParcels} parcelas con área válida`}
              icon={<ChartPie size={18} />}
              title="Distribución de parcelas según categoría"
            />
            <ParcelCategoryPieChart data={report.distribution} metric="parcels" />
          </article>

          <article className="panel report-section parcel-report__map">
            <ReportSectionHeader
              description={`${mapData.mappableCount} visibles · ${mapData.missingGeodataCount} sin geodatos`}
              icon={<MapPinned size={18} />}
              title="Parcelas por categoría"
            />
            <CategoryLegend data={report.distribution} />
            <AdminMap
              emptyMessage="No hay parcelas categorizadas con geodatos para estos filtros."
              minHeight={430}
              points={mapData.points}
              polygons={mapData.polygons}
            />
          </article>

          <article className="panel report-section parcel-report__hectare-chart">
            <ReportSectionHeader
              description={`${formatNumber(report.totals.hectares)} hectáreas registradas en el conjunto filtrado`}
              icon={<Ruler size={18} />}
              title="Distribución de hectáreas según categoría"
            />
            <ParcelCategoryPieChart data={report.distribution} metric="hectares" />
          </article>
        </div>
      ) : null}
    </section>
  );

  function updateDraft<K extends keyof ParcelsReportFilters>(
    key: K,
    value: ParcelsReportFilters[K]
  ) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSectorChange(value: string) {
    setDraftFilters((current) => ({
      ...current,
      sectorId: value,
      subsectorId:
        value &&
        current.subsectorId &&
        catalogs?.subsectores.some(
          (item) => item.id === current.subsectorId && item.sectorId === value
        )
          ? current.subsectorId
          : ""
    }));
  }

  function handleClearFilters() {
    const filters = currentMonthParcelsReportFilters();
    setValidationError(null);
    setDraftFilters(filters);
    setAppliedFilters(filters);
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
    setAppliedFilters({ ...draftFilters });
  }

  function metricStatus() {
    return reportError ? "No disponible" : isLoadingReport ? "Cargando" : null;
  }

  async function loadCatalogs() {
    if (!session) return;
    try {
      setIsLoadingCatalogs(true);
      setCatalogError(null);
      setCatalogs(await reportesService.getParcelsReportCatalogs(session));
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

  async function loadReport(filters: ParcelsReportFilters) {
    if (!session) return;
    try {
      setIsLoadingReport(true);
      setReportError(null);
      setReport(await reportesService.getParcelsReport(session, filters));
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

function ParcelsSummaryTable({ report }: { report: ParcelsReportData }) {
  return (
    <div className="data-table__wrapper">
      <table className="data-table parcel-summary-table">
        <caption>Superficie y cantidad de parcelas por asignación actual</caption>
        <thead>
          <tr>
            <th>Ingeniero</th>
            <th>Hectáreas</th>
            <th>Parcelas</th>
            <th>Media de HT por parcela</th>
          </tr>
        </thead>
        <tbody>
          {report.summary.map((item) => (
            <tr key={item.agronomistUserId}>
              <th scope="row">{item.engineerName}</th>
              <td>{formatNumber(item.hectares)}</td>
              <td>{formatInteger(item.parcelsCount)}</td>
              <td>{formatNumber(item.averageHectaresPerParcel)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{formatNumber(report.totals.hectares)}</td>
            <td>{formatInteger(report.totals.parcels)}</td>
            <td>{formatNumber(report.totals.averageHectaresPerParcel)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CategoryLegend({ data }: { data: ParcelsReportData["distribution"] }) {
  return (
    <div className="parcel-category-legend" aria-label="Leyenda de categorías">
      {data.map((item) => (
        <span key={item.code}>
          <i
            aria-hidden="true"
            style={{ backgroundColor: PARCEL_CATEGORY_COLORS[item.code] }}
          />
          {item.name}
        </span>
      ))}
    </div>
  );
}

function ReportMetric({
  icon,
  label,
  status,
  value
}: {
  icon: ReactNode;
  label: string;
  status: string | null;
  value: string;
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

function formatInteger(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}
