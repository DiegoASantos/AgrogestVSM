"use client";

import {
  ChartPie,
  Filter,
  Layers3,
  MapPinned,
  Sprout,
  TableProperties,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { AdminMap } from "../../../shared/components/admin-map";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import { TableSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { buildProductorLabel, reportesService } from "../services/reportes.service";
import type {
  FieldsByStageCatalogs,
  FieldsByStageFilters,
  FieldsByStageReportData
} from "../types/reportes.types";
import {
  buildFieldsByStageMapData,
  emptyFieldsByStageFilters
} from "../utils/reportes-campos-etapas";
import { FieldsByStagePies } from "./fields-by-stage-pies";

const emptyReport: FieldsByStageReportData = {
  stages: [],
  summary: {
    totalCategorizedParcels: 0,
    uncategorizedParcels: 0,
    byStage: [],
    byEngineer: []
  },
  parcels: []
};

export function FieldsByStageOverview() {
  const { session, logout } = useAuthSession();
  const [draftFilters, setDraftFilters] = useState<FieldsByStageFilters>({
    ...emptyFieldsByStageFilters
  });
  const [appliedFilters, setAppliedFilters] = useState<FieldsByStageFilters>({
    ...emptyFieldsByStageFilters
  });
  const [catalogs, setCatalogs] = useState<FieldsByStageCatalogs | null>(null);
  const [report, setReport] = useState<FieldsByStageReportData>(emptyReport);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
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
  const mapData = useMemo(() => buildFieldsByStageMapData(report), [report]);

  return (
    <section className="panel-grid report-visits fields-stage-report">
      <article className="panel report-visits__hero">
        <ToolbarActions
          description="Estado actual de cada parcela según la etapa o labor de su última visita activa."
          eyebrow="Reportes"
          title="Campos por etapas"
        />

        <div className="filter-card report-visits__filters fields-stage-report__filters">
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
          </div>
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
              onClick={() => setAppliedFilters({ ...draftFilters })}
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
            icon={<Sprout size={19} />}
            label="Parcelas categorizadas"
            status={reportError ? "No disponible" : isLoadingReport ? "Cargando" : null}
            value={report.summary.totalCategorizedParcels}
          />
          <ReportMetric
            icon={<UsersRound size={19} />}
            label="Ingenieros activos"
            status={reportError ? "No disponible" : isLoadingReport ? "Cargando" : null}
            value={report.summary.byEngineer.length}
          />
          <ReportMetric
            icon={<Layers3 size={19} />}
            label="Etapas y labores activas"
            status={reportError ? "No disponible" : isLoadingReport ? "Cargando" : null}
            value={report.stages.length}
          />
          <ReportMetric
            icon={<MapPinned size={19} />}
            label="Parcelas sin geodatos"
            status={reportError ? "No disponible" : isLoadingReport ? "Cargando" : null}
            value={mapData.missingGeodataCount}
          />
        </div>
      </article>

      <article className="panel report-section report-section--summary">
        <ReportSectionHeader
          description={`${report.summary.uncategorizedParcels} parcelas sin etapa o labor activa en su última visita`}
          icon={<TableProperties size={18} />}
          title="Resumen por etapas y labores"
        />
        <ReportContentState
          error={reportError}
          onRetry={() => void loadReport(appliedFilters)}
        />
        {!reportError && isLoadingReport ? (
          <TableSkeleton
            columns={Math.max(2, report.stages.length + 1)}
            description="Calculando la última visita activa de cada parcela."
          />
        ) : null}
        {!reportError && !isLoadingReport && report.summary.byEngineer.length === 0 ? (
          <EmptyState
            description="No hay ingenieros activos que coincidan con los filtros seleccionados."
            title="Sin filas para mostrar"
          />
        ) : null}
        {!reportError && !isLoadingReport && report.summary.byEngineer.length > 0 ? (
          <StageSummaryTable report={report} />
        ) : null}
      </article>

      <article className="panel report-section report-section--map fields-stage-report__map">
        <ReportSectionHeader
          description={`${mapData.mappableCount} parcelas visibles · ${mapData.missingGeodataCount} sin geodatos`}
          icon={<MapPinned size={18} />}
          title="Parcelas según etapa o labor"
        />
        {!reportError && !isLoadingReport ? (
          <>
            <StageLegend report={report} colors={mapData.colors} />
            <AdminMap
              emptyMessage="No hay parcelas categorizadas con geodatos para estos filtros."
              minHeight={430}
              points={mapData.points}
              polygons={mapData.polygons}
            />
          </>
        ) : null}
      </article>

      <article className="panel report-section fields-stage-report__pies">
        <ReportSectionHeader
          description="Cada gráfico distribuye las parcelas por la etapa o labor de la última visita registrada por ese ingeniero."
          icon={<ChartPie size={18} />}
          title="Distribución por ingeniero"
        />
        {!reportError && !isLoadingReport && report.summary.byEngineer.length > 0 ? (
          <FieldsByStagePies
            colors={mapData.colors}
            engineers={report.summary.byEngineer}
            stages={report.stages}
          />
        ) : null}
      </article>
    </section>
  );

  function updateDraft(key: keyof FieldsByStageFilters, value: string) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function handleClearFilters() {
    setDraftFilters({ ...emptyFieldsByStageFilters });
    setAppliedFilters({ ...emptyFieldsByStageFilters });
  }

  async function loadCatalogs() {
    if (!session) return;

    try {
      setIsLoadingCatalogs(true);
      setCatalogError(null);
      setCatalogs(await reportesService.getFieldsByStageCatalogs(session));
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

  async function loadReport(filters: FieldsByStageFilters) {
    if (!session) return;

    try {
      setIsLoadingReport(true);
      setReportError(null);
      setReport(await reportesService.getFieldsByStageReport(session, filters));
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

function StageSummaryTable({ report }: { report: FieldsByStageReportData }) {
  const totalsByStage = new Map(
    report.summary.byStage.map((item) => [item.stageId, item])
  );

  return (
    <div className="data-table__wrapper stage-summary-table__wrapper">
      <table className="data-table stage-summary-table">
        <caption>
          Cantidad y porcentaje global de parcelas por ingeniero y etapa o labor
        </caption>
        <thead>
          <tr>
            <th>Ingeniero</th>
            {report.stages.map((stage) => (
              <th key={stage.id}>{stage.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.summary.byEngineer.map((engineer) => (
            <tr key={engineer.agronomistUserId}>
              <th scope="row">{engineer.engineerName}</th>
              {engineer.stages.map((item) => (
                <td key={item.stageId}>
                  <strong>{item.count}</strong>
                  <span>({formatPercentage(item.percentageOfFilteredTotal)})</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {report.stages.map((stage) => {
              const total = totalsByStage.get(stage.id);
              return (
                <td key={stage.id}>
                  <strong>{total?.count ?? 0}</strong>
                  <span>({formatPercentage(total?.percentage ?? 0)})</span>
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function StageLegend({
  report,
  colors
}: {
  report: FieldsByStageReportData;
  colors: Map<string, string>;
}) {
  return (
    <div className="stage-map-legend" aria-label="Leyenda del mapa">
      {report.stages.map((stage) => (
        <span key={stage.id}>
          <i aria-hidden="true" style={{ backgroundColor: colors.get(stage.id) }} />
          {stage.name}
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
  value: number;
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
            formatInteger(value)
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

function ReportContentState({
  error,
  onRetry
}: {
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
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
        description={error}
        title="No se pudo cargar el reporte"
      />
    );
  }

  return null;
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
}
