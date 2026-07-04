"use client";

import { Map } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { Pagination } from "../../../shared/components/pagination";
import { TableSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { visitasService } from "../services/visitas.service";
import type {
  ProductorCalificacion,
  ProductorVisitasHistory,
  VisitaFilterCatalogs,
  VisitaListFilters
} from "../types/visitas.types";
import { VisitasTable } from "./visitas-table";

type ProductorVisitasHistoryScreenProps = {
  productorId: string;
};

const PAGE_SIZE = 30;

const emptyFilters = {
  campaignId: "",
  agronomistUserId: "",
  startDate: "",
  endDate: ""
};

export function ProductorVisitasHistoryScreen({
  productorId
}: ProductorVisitasHistoryScreenProps) {
  const { session, logout } = useAuthSession();
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [catalogs, setCatalogs] = useState<VisitaFilterCatalogs | null>(null);
  const [history, setHistory] = useState<ProductorVisitasHistory | null>(null);
  const [calificacion, setCalificacion] = useState<ProductorCalificacion | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadCatalogs();
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadHistory(appliedFilters, page);
  }, [appliedFilters, page, productorId, session]);

  const campaignLabels = useMemo(
    () => createOptionLabelMap(catalogs?.campanias ?? []),
    [catalogs?.campanias]
  );
  const agronomistLabels = useMemo(
    () => createOptionLabelMap(catalogs?.agronomos ?? []),
    [catalogs?.agronomos]
  );
  const parcelaLabels = useMemo(
    () => createOptionLabelMap(catalogs?.parcelas ?? []),
    [catalogs?.parcelas]
  );

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const fromItem = (page - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(page * PAGE_SIZE, history?.count ?? 0);

  return (
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <>
              <Link
                className="ui-button ui-button--ghost"
                href={buildAdminMapHref({
                  productorId,
                  agronomistUserId: appliedFilters.agronomistUserId,
                  campaignId: appliedFilters.campaignId,
                  startDate: appliedFilters.startDate,
                  endDate: appliedFilters.endDate
                })}
              >
                <Map size={15} />
                Abrir mapa
              </Link>
              <Link
                className="ui-button ui-button--secondary"
                href={`/mantenimiento/productores/${productorId}`}
              >
                Gestionar sectores
              </Link>
            </>
          }
          description="Historial administrativo de visitas del productor con filtros basicos por campaña, agronomo y fechas."
          eyebrow="Visitas"
            title={
              history
              ? `Historial del productor ${buildProductorLabel(history.productor)}`
              : "Historial del productor"
            }
        />

        {calificacion ? (
          <ProductorScoreSummary
            calificacion={calificacion}
            campaignLabels={campaignLabels}
          />
        ) : null}

        <div className="filter-card">
          <div className="filter-card__header">Filtros</div>
          <div className="filter-card__body">
            <label className="field-group">
              <span className="field-group__label">Campaña</span>
              <select
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    campaignId: event.target.value
                  }))
                }
                value={draftFilters.campaignId}
              >
                <option value="">Todas</option>
                {(catalogs?.campanias ?? []).map((campania) => (
                  <option key={campania.id} value={campania.id}>
                    {campania.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="field-group__label">Agronomo</span>
              <select
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    agronomistUserId: event.target.value
                  }))
                }
                value={draftFilters.agronomistUserId}
              >
                <option value="">Todos</option>
                {(catalogs?.agronomos ?? []).map((agronomo) => (
                  <option key={agronomo.id} value={agronomo.id}>
                    {agronomo.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="field-group__label">Fecha desde</span>
              <input
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    startDate: event.target.value
                  }))
                }
                type="date"
                value={draftFilters.startDate}
              />
            </label>

            <label className="field-group">
              <span className="field-group__label">Fecha hasta</span>
              <input
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    endDate: event.target.value
                  }))
                }
                type="date"
                value={draftFilters.endDate}
              />
            </label>
          </div>
          {validationError ? <p className="form-error" style={{ padding: "0 16px" }}>{validationError}</p> : null}
          <div className="filter-card__footer">
            <button className="ui-button ui-button--ghost ui-button--compact" onClick={handleClearFilters} type="button">
              Limpiar
            </button>
            <button className="ui-button ui-button--primary" onClick={handleApplyFilters} type="button">
              Aplicar filtros
            </button>
          </div>
        </div>

        {catalogError ? (
          <ErrorState
            action={
              <button className="ui-button ui-button--secondary" onClick={() => void loadCatalogs()} type="button">
                Reintentar catalogos
              </button>
            }
            description={catalogError}
            title="No se pudieron cargar los filtros"
          />
        ) : null}

        {isLoadingCatalogs ? (
          <LoadingState description="Cargando catalogos de apoyo para el historial." />
        ) : null}

        {errorMessage ? (
          <ErrorState
            action={
              <button className="ui-button ui-button--secondary" onClick={() => void loadHistory(appliedFilters, page)} type="button">
                Reintentar historial
              </button>
            }
            description={errorMessage}
          />
        ) : null}

        {!errorMessage && isLoadingHistory ? (
          <TableSkeleton
            columns={7}
            description="Cargando historial de visitas del productor."
          />
        ) : null}

        {!errorMessage && !isLoadingHistory && history?.visitas.length === 0 ? (
          <EmptyState
            description="El productor no tiene visitas para los filtros seleccionados."
            title="Sin historial de visitas"
          />
        ) : null}

        {!errorMessage && !isLoadingHistory && history && history.visitas.length > 0 ? (
          <>
            <p className="body-copy visitas-results-copy">
              {history.count} visita{history.count === 1 ? "" : "s"} encontrada
              {history.count === 1 ? "" : "s"}
              {history.totalPages > 1 ? ` — Mostrando ${fromItem}–${toItem}` : ""}.
            </p>
            <VisitasTable
              agronomistLabels={agronomistLabels}
              campaignLabels={campaignLabels}
              getMapHref={(visita) =>
                buildAdminMapHref({
                  productorId,
                  visitaId: visita.id,
                  parcelaId: visita.parcelaId,
                  campaignId: visita.campaignId,
                  agronomistUserId: visita.agronomistUserId
                })
              }
              items={history.visitas}
              parcelaLabels={parcelaLabels}
            />
            <Pagination
              loading={isLoadingHistory}
              onPageChange={handlePageChange}
              page={history.page}
              totalPages={history.totalPages}
            />
          </>
        ) : null}
      </article>
    </section>
  );

  function handleApplyFilters() {
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      setValidationError("fecha_hasta debe ser mayor o igual a fecha_desde.");
      return;
    }

    setValidationError(null);
    setPage(1);
    setAppliedFilters(draftFilters);
  }

  function handleClearFilters() {
    setValidationError(null);
    setDraftFilters(emptyFilters);
    setPage(1);
    setAppliedFilters(emptyFilters);
  }

  async function loadCatalogs() {
    if (!session) {
      return;
    }

    try {
      setIsLoadingCatalogs(true);
      setCatalogError(null);
      const nextCatalogs = await visitasService.getFilterCatalogs(session);
      setCatalogs(nextCatalogs);
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

  async function loadHistory(
    filters: Pick<
      VisitaListFilters,
      "campaignId" | "agronomistUserId" | "startDate" | "endDate"
    >,
    currentPage: number
  ) {
    if (!session) {
      return;
    }

    try {
      setIsLoadingHistory(true);
      setErrorMessage(null);
      const [nextHistory, nextCalificacion] = await Promise.all([
        visitasService.getHistoryByProductor(
          session,
          productorId,
          filters,
          currentPage,
          PAGE_SIZE
        ),
        visitasService.getProductorCalificacion(
          session,
          productorId,
          filters.campaignId || undefined
        )
      ]);
      setHistory(nextHistory);
      setCalificacion(nextCalificacion);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setErrorMessage(apiError.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }
}

function ProductorScoreSummary({
  calificacion,
  campaignLabels
}: {
  calificacion: ProductorCalificacion;
  campaignLabels: globalThis.Map<string, string>;
}) {
  const campaigns = Object.entries(calificacion.scorePorCampania);

  return (
    <div className="visit-detail__notes">
      <div className="visit-detail__note">
        <span>Score general</span>
        <strong>{formatScore(calificacion.scoreGeneral)}</strong>
      </div>
      <div className="visit-detail__note">
        <span>Visitas calificadas</span>
        <strong>
          {calificacion.totalVisitasCalificadas}/{calificacion.totalVisitas}
        </strong>
      </div>
      <div className="visit-detail__note">
        <span>Score por campania</span>
        <strong>
          {campaigns.length === 0
            ? "Sin campanias calificadas"
            : campaigns
                .map(
                  ([campaignId, score]) =>
                    `${campaignLabels.get(campaignId) ?? `Campania #${campaignId}`}: ${formatScore(score.scoreGeneral)}`
                )
                .join(" | ")}
        </strong>
      </div>
    </div>
  );
}

function formatScore(value: number | null) {
  return value === null ? "Sin score" : `${value}%`;
}

function buildProductorLabel(productor: ProductorVisitasHistory["productor"]) {
  return (
    [productor.firstName, productor.lastName].filter(Boolean).join(" ").trim() ||
    productor.documentNumber ||
    productor.publicId
  );
}

function createOptionLabelMap(
  options: readonly { id: string; label: string }[]
) {
  return new globalThis.Map(options.map((option) => [option.id, option.label]));
}
