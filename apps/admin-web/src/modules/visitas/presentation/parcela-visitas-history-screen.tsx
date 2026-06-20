"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { TableSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { visitasService } from "../services/visitas.service";
import type {
  AgronomistFilterOption,
  CampaignFilterOption,
  ParcelaVisitasHistory,
  VisitaFilterCatalogs
} from "../types/visitas.types";
import { VisitasTable } from "./visitas-table";

type ParcelaVisitasHistoryScreenProps = {
  parcelaId: string;
};

export function ParcelaVisitasHistoryScreen({
  parcelaId
}: ParcelaVisitasHistoryScreenProps) {
  const { session, logout } = useAuthSession();
  const [catalogs, setCatalogs] = useState<VisitaFilterCatalogs | null>(null);
  const [history, setHistory] = useState<ParcelaVisitasHistory | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadCatalogs();
    void loadHistory();
  }, [parcelaId, session]);

  const campaignLabels = useMemo(
    () => createOptionLabelMap(catalogs?.campanias ?? []),
    [catalogs?.campanias]
  );
  const agronomistLabels = useMemo(
    () => createOptionLabelMap(catalogs?.agronomos ?? []),
    [catalogs?.agronomos]
  );

  return (
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <>
              <button className="ui-button ui-button--ghost" onClick={() => void loadHistory()} type="button">
                Recargar
              </button>
              <Link
                className="ui-button ui-button--ghost"
                href={buildAdminMapHref({
                  parcelaId
                })}
              >
                Ver en mapa
              </Link>
              <Link className="ui-button ui-button--secondary" href="/mantenimiento/productores">
                Volver a productores
              </Link>
            </>
          }
          description="Historial simple de una parcela ordenado por la visita mas reciente."
          eyebrow="Visitas"
          title={
            history
              ? `Historial de parcela ${history.parcela.code}`
              : "Historial de parcela"
          }
        />

        {history ? (
          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-card__label">Parcela</p>
              <p className="stat-card__value stat-card__value--small">
                {history.parcela.code}
                {history.parcela.name ? ` - ${history.parcela.name}` : ""}
              </p>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Public ID</p>
              <p className="stat-card__value stat-card__value--small">
                {history.parcela.publicId}
              </p>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Sector</p>
              <p className="stat-card__value stat-card__value--small">
                {history.lookups.sector?.name ?? history.parcela.sectorId}
              </p>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Visitas</p>
              <p className="stat-card__value">{history.count}</p>
            </article>
          </div>
        ) : null}

        {catalogError ? (
          <ErrorState
            action={
              <button className="ui-button ui-button--secondary" onClick={() => void loadCatalogs()} type="button">
                Reintentar catalogos
              </button>
            }
            description={catalogError}
            title="No se pudieron cargar los catalogos de apoyo"
          />
        ) : null}

        {isLoadingCatalogs ? (
          <LoadingState description="Cargando catalogos de apoyo para el historial." />
        ) : null}

        {errorMessage ? (
          <ErrorState
            action={
              <button className="ui-button ui-button--secondary" onClick={() => void loadHistory()} type="button">
                Reintentar historial
              </button>
            }
            description={errorMessage}
          />
        ) : null}

        {!errorMessage && isLoadingHistory ? (
          <TableSkeleton
            columns={6}
            description="Cargando historial de visitas de la parcela."
          />
        ) : null}

        {!errorMessage && !isLoadingHistory && history?.visitas.length === 0 ? (
          <EmptyState
            description="La parcela no tiene visitas registradas todavia."
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
                  visitaId: visita.id,
                  parcelaId: visita.parcelaId,
                  campaignId: visita.campaignId,
                  agronomistUserId: visita.agronomistUserId
                })
              }
              items={history.visitas}
              showParcelaColumn={false}
            />
          </>
        ) : null}
      </article>
    </section>
  );

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

  async function loadHistory() {
    if (!session) {
      return;
    }

    try {
      setIsLoadingHistory(true);
      setErrorMessage(null);
      const nextHistory = await visitasService.getHistoryByParcela(session, parcelaId);
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
  options: CampaignFilterOption[] | AgronomistFilterOption[]
) {
  return new Map(options.map((option) => [option.id, option.label]));
}
