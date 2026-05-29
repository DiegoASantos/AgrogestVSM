"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { FilterBar } from "../../../shared/components/filter-bar";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { visitasService } from "../services/visitas.service";
import type {
  AgronomistFilterOption,
  CampaignFilterOption,
  ParcelaFilterOption,
  ProductorVisitasHistory,
  VisitaFilterCatalogs,
  VisitaListFilters
} from "../types/visitas.types";
import { VisitasTable } from "./visitas-table";

type ProductorVisitasHistoryScreenProps = {
  productorId: string;
};

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
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
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

    void loadHistory(appliedFilters);
  }, [appliedFilters, productorId, session]);

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

  return (
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <>
              <button
                className="ui-button ui-button--ghost"
                onClick={() => void loadHistory(appliedFilters)}
                type="button"
              >
                Recargar
              </button>
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
          description="Historial administrativo de visitas del productor con filtros básicos por campaña, agrónomo y fechas."
          eyebrow="Visitas"
          title={
            history
              ? `Historial del productor ${history.productor.documentNumber}`
              : "Historial del productor"
          }
        />

        <FilterBar
          actions={
            <>
              <button className="ui-button ui-button--ghost" onClick={handleClearFilters} type="button">
                Limpiar
              </button>
              <button className="ui-button ui-button--primary" onClick={handleApplyFilters} type="button">
                Aplicar filtros
              </button>
            </>
          }
        >
          <label className="field-group">
            <span>Campaña</span>
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
            <span>Agronomo</span>
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
            <span>Fecha desde</span>
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
            <span>Fecha hasta</span>
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
        </FilterBar>

        {validationError ? <p className="form-error">{validationError}</p> : null}

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
              <button className="ui-button ui-button--secondary" onClick={() => void loadHistory(appliedFilters)} type="button">
                Reintentar historial
              </button>
            }
            description={errorMessage}
          />
        ) : null}

        {!errorMessage && isLoadingHistory ? (
          <LoadingState description="Cargando historial de visitas del productor." />
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
              {history.count === 1 ? "" : "s"}.
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
    setAppliedFilters(draftFilters);
  }

  function handleClearFilters() {
    setValidationError(null);
    setDraftFilters(emptyFilters);
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
    >
  ) {
    if (!session) {
      return;
    }

    try {
      setIsLoadingHistory(true);
      setErrorMessage(null);
      const nextHistory = await visitasService.getHistoryByProductor(
        session,
        productorId,
        filters
      );
      setHistory(nextHistory);
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

function createOptionLabelMap(
  options: CampaignFilterOption[] | ParcelaFilterOption[] | AgronomistFilterOption[]
) {
  return new Map(options.map((option) => [option.id, option.label]));
}
