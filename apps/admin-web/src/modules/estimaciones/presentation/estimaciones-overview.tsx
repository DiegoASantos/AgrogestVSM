"use client";

import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Save,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { estimacionesService } from "../services/estimaciones.service";
import type { EstimationWeekData } from "../types/estimaciones.types";
import {
  buildEstimateChanges,
  createEstimateDrafts,
  currentWeekStart,
  formatWeekRange,
  normalizeWeekStart,
  shiftWeek,
  validateEstimateDrafts
} from "../utils/estimation-week";

export function EstimacionesOverview() {
  const { session, logout } = useAuthSession();
  const [selectedWeek, setSelectedWeek] = useState(() => currentWeekStart());
  const [data, setData] = useState<EstimationWeekData | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session) {
      void loadWeek(selectedWeek);
    }
  }, [selectedWeek, session]);

  const changes = useMemo(
    () => (data ? buildEstimateChanges(data, drafts) : []),
    [data, drafts]
  );
  const weekLabel = data
    ? formatWeekRange(data.startDate, data.endDate)
    : "Preparando semana";

  return (
    <section className="panel-grid report-visits estimations-screen">
      <article className="panel report-visits__hero estimations-hero">
        <ToolbarActions
          description="Define la meta de cada agrónomo y compárala con las visitas registradas en la misma semana."
          eyebrow="Planificación de campo"
          title="Estimaciones semanales"
          actions={
            <>
              <button
                className="ui-button ui-button--primary"
                disabled={isLoading || isSaving || changes.length === 0}
                onClick={() => void handleSave()}
                type="button"
              >
                <Save aria-hidden="true" size={16} />
                {isSaving
                  ? "Guardando…"
                  : `Guardar cambios${changes.length ? ` (${changes.length})` : ""}`}
              </button>
              <Link className="ui-button ui-button--ghost" href={adminRoutes.visitas}>
                Ver visitas reales
              </Link>
              <Link
                className="ui-button ui-button--secondary"
                href={adminRoutes.dashboard}
              >
                Volver a dashboard
              </Link>
            </>
          }
        />

        <div className="filter-card report-visits__filters estimations-weekbar">
          <div className="filter-card__header">
            <CalendarRange aria-hidden="true" size={16} />
            <span>Semana de planificación</span>
          </div>
          <div className="estimations-weekbar__body">
            <div className="estimations-weekbar__navigation">
              <button
                aria-label="Semana anterior"
                className="ui-button ui-button--ghost ui-button--compact"
                disabled={isLoading || isSaving}
                onClick={() => changeWeek(shiftWeek(selectedWeek, -1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={17} />
              </button>
              <div className="estimations-weekbar__range">
                <span className="estimations-weekbar__range-icon">
                  <CalendarRange aria-hidden="true" size={19} />
                </span>
                <div>
                  <span>Semana seleccionada</span>
                  <strong>{weekLabel}</strong>
                </div>
              </div>
              <button
                aria-label="Semana siguiente"
                className="ui-button ui-button--ghost ui-button--compact"
                disabled={isLoading || isSaving}
                onClick={() => changeWeek(shiftWeek(selectedWeek, 1))}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={17} />
              </button>
            </div>

            <div className="estimations-weekbar__picker">
              <label className="field-group">
                <span className="field-group__label">Ir a una fecha</span>
                <input
                  disabled={isLoading || isSaving}
                  onChange={(event) => changeWeek(normalizeWeekStart(event.target.value))}
                  type="date"
                  value={selectedWeek}
                />
              </label>
              <button
                className="ui-button ui-button--secondary ui-button--compact"
                disabled={isLoading || isSaving}
                onClick={() => changeWeek(currentWeekStart())}
                type="button"
              >
                Semana actual
              </button>
            </div>
          </div>
        </div>

        {data ? (
          <div
            aria-label="Totales de la semana"
            className="report-metrics estimations-summary"
          >
            <SummaryMetric
              icon={<UsersRound size={18} />}
              label="Agrónomos"
              value={data.totals.agronomists}
            />
            <SummaryMetric
              icon={<Target size={18} />}
              label="Visitas estimadas"
              value={data.totals.estimatedVisits}
            />
            <SummaryMetric
              icon={<CalendarRange size={18} />}
              label="Visitas reales"
              value={data.totals.actualVisits}
            />
            <SummaryMetric
              icon={
                data.totals.difference < 0 ? (
                  <TrendingDown size={18} />
                ) : (
                  <TrendingUp size={18} />
                )
              }
              label="Diferencia total"
              tone={differenceTone(data.totals.difference)}
              value={formatSigned(data.totals.difference)}
            />
          </div>
        ) : null}

        {error ? (
          <ErrorState
            action={
              <button
                className="ui-button ui-button--secondary"
                onClick={() => void loadWeek(selectedWeek)}
                type="button"
              >
                Reintentar
              </button>
            }
            description={error}
            title="No se pudo cargar la semana"
          />
        ) : null}

        {!error && isLoading ? (
          <LoadingState description="Calculando metas y visitas reales de la semana." />
        ) : null}

        {!error && !isLoading && data?.rows.length === 0 ? (
          <EmptyState
            description="Activa un usuario con rol AGRONOMO para comenzar la planificación semanal."
            title="No hay agrónomos para planificar"
          />
        ) : null}

        {!error && !isLoading && data && data.rows.length > 0 ? (
          <section className="estimations-table-panel">
            <header className="estimations-table-panel__header">
              <div>
                <h3>Planilla de la semana</h3>
                <p>
                  Registra las visitas previstas y revisa el avance real por agrónomo.
                </p>
              </div>
              <span>{data.totals.withEstimate} con estimación guardada</span>
            </header>

            <div className="estimations-guidance">
              <CircleHelp aria-hidden="true" size={17} />
              <p>
                <strong>Cumplimiento</strong> = visitas reales ÷ estimadas. Se muestra
                <strong> No aplica</strong> cuando no hay estimación o cuando su valor es
                0. Deja una celda vacía para retirar una estimación guardada.
              </p>
            </div>

            {validationError ? (
              <p className="form-error form-error--block" role="alert">
                {validationError}
              </p>
            ) : null}
            {successMessage ? (
              <p className="estimations-save-status" role="status">
                {successMessage}
              </p>
            ) : null}

            <div className="data-table__wrapper estimations-table-wrapper">
              <table className="data-table estimations-table">
                <caption>Estimaciones y cumplimiento por agrónomo</caption>
                <thead>
                  <tr>
                    <th>Agrónomo</th>
                    <th>Estimadas</th>
                    <th>Reales</th>
                    <th>Diferencia</th>
                    <th>Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      className={
                        row.isEditable ? undefined : "estimations-table__inactive"
                      }
                      key={row.agronomistUserId}
                    >
                      <td>
                        <div className="estimations-engineer">
                          <strong>{row.engineerName}</strong>
                          <span className={row.isEditable ? "is-active" : "is-inactive"}>
                            {row.isEditable
                              ? "Activo"
                              : row.isActive
                                ? "Histórico · sin rol"
                                : "Histórico · inactivo"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="estimations-input-cell">
                          <input
                            aria-label={`Visitas estimadas para ${row.engineerName}`}
                            disabled={!row.isEditable || isSaving}
                            inputMode="numeric"
                            min="0"
                            onChange={(event) =>
                              updateDraft(row.agronomistUserId, event.target.value)
                            }
                            placeholder="Sin meta"
                            step="1"
                            type="number"
                            value={drafts[row.agronomistUserId] ?? ""}
                          />
                          <div className="estimations-input-cell__audit">
                            {row.createdAt && row.createdByName ? (
                              <small title={formatAuditDate(row.createdAt)}>
                                Creó {row.createdByName}
                              </small>
                            ) : null}
                            {row.updatedAt && row.updatedByName ? (
                              <small title={formatAuditDate(row.updatedAt)}>
                                Editó {row.updatedByName}
                              </small>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="estimations-table__number">{row.actualVisits}</td>
                      <td
                        className={`estimations-table__number ${differenceClass(row.difference)}`}
                      >
                        {row.difference === null ? "—" : formatSigned(row.difference)}
                      </td>
                      <td className="estimations-table__number">
                        {row.compliancePercentage === null ? (
                          <span className="estimations-compliance-na">No aplica</span>
                        ) : (
                          `${formatPercentage(row.compliancePercentage)}%`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </article>
    </section>
  );

  function updateDraft(userId: string, value: string) {
    setDrafts((current) => ({ ...current, [userId]: value }));
    setValidationError(null);
    setSuccessMessage(null);
  }

  function changeWeek(nextWeek: string) {
    if (
      changes.length > 0 &&
      !window.confirm("Hay cambios sin guardar. ¿Cambiar de semana y descartarlos?")
    ) {
      return;
    }
    setSelectedWeek(nextWeek);
    setSuccessMessage(null);
    setValidationError(null);
  }

  async function loadWeek(week: string) {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    setValidationError(null);

    try {
      const nextData = await estimacionesService.getWeek(session, week);
      setData(nextData);
      setDrafts(createEstimateDrafts(nextData));
    } catch (caughtError) {
      const apiError = toApiError(caughtError);
      if (apiError.statusCode === 401) {
        logout();
        return;
      }
      setError(apiError.message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!session || !data) return;
    const nextValidationError = validateEstimateDrafts(data, drafts);
    if (nextValidationError) {
      setValidationError(nextValidationError);
      return;
    }

    const nextChanges = buildEstimateChanges(data, drafts);
    if (nextChanges.length === 0) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const nextData = await estimacionesService.saveWeek(
        session,
        selectedWeek,
        nextChanges
      );
      setData(nextData);
      setDrafts(createEstimateDrafts(nextData));
      setSuccessMessage("Estimaciones guardadas. La comparación ya está actualizada.");
    } catch (caughtError) {
      const apiError = toApiError(caughtError);
      if (apiError.statusCode === 401) {
        logout();
        return;
      }
      setValidationError(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }
}

function SummaryMetric({
  icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div
      className={`report-metric estimations-summary__item estimations-summary__item--${tone}`}
    >
      <span className="report-metric__icon">{icon}</span>
      <div className="report-metric__copy">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value);
}

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima"
  }).format(new Date(value));
}

function differenceTone(value: number) {
  if (value > 0) return "positive" as const;
  if (value < 0) return "negative" as const;
  return "neutral" as const;
}

function differenceClass(value: number | null) {
  if (value === null || value === 0) return "estimations-difference--neutral";
  return value > 0
    ? "estimations-difference--positive"
    : "estimations-difference--negative";
}
