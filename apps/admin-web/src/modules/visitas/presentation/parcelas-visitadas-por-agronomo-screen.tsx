"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DataTable, type DataTableColumn } from "../../../shared/components/data-table";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { TableSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { formatDateOnly } from "../../../shared/utils/date-only";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { visitasService } from "../services/visitas.service";
import type {
  ParcelaVisitadaPorAgronomo,
  ParcelasVisitadasPorAgronomoResponse,
  VisitaFilterCatalogs
} from "../types/visitas.types";

export function ParcelasVisitadasPorAgronomoScreen() {
  const { session, logout } = useAuthSession();
  const [catalogs, setCatalogs] = useState<VisitaFilterCatalogs | null>(null);
  const [selectedAgronomistId, setSelectedAgronomistId] = useState("");
  const [result, setResult] =
    useState<ParcelasVisitadasPorAgronomoResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadCatalogs();
  }, [session]);

  const columns: DataTableColumn<ParcelaVisitadaPorAgronomo>[] = [
    {
      key: "parcela",
      header: "Parcela",
      cell: (parcela) => (
        <div className="table-copy">
          <strong>{parcela.parcelaLabel}</strong>
          <span>ID: {parcela.parcelaId}</span>
        </div>
      )
    },
    {
      key: "visitas",
      header: "Visitas",
      cell: (parcela) => (
        <span className="table-badge">{parcela.visitCount}</span>
      )
    },
    {
      key: "primera",
      header: "Primera visita",
      cell: (parcela) => formatDate(parcela.firstVisitDate)
    },
    {
      key: "ultima",
      header: "Ultima visita",
      cell: (parcela) => formatDate(parcela.lastVisitDate)
    },
    {
      key: "actions",
      header: "Acciones",
      className: "data-table__actions",
      cell: (parcela) => (
        <div className="table-actions">
          <Link
            className="ui-button ui-button--secondary ui-button--compact"
            href={`/visitas/parcelas/${parcela.parcelaId}`}
          >
            Ver historial
          </Link>
          <Link
            className="ui-button ui-button--ghost ui-button--compact"
            href={buildAdminMapHref({
              parcelaId: parcela.parcelaId,
              agronomistUserId: result?.agronomistUserId ?? ""
            })}
          >
            Ver mapa
          </Link>
        </div>
      )
    }
  ];

  return (
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <Link className="ui-button ui-button--secondary" href="/visitas">
              Volver a visitas
            </Link>
          }
          description="Selecciona un agronomo para ver las parcelas que ha visitado y navegar al historial completo de cada una."
          eyebrow="Visitas"
          title="Parcelas visitadas por agronomo"
        />

        {catalogError ? (
          <ErrorState
            action={
              <button
                className="ui-button ui-button--secondary"
                onClick={() => void loadCatalogs()}
                type="button"
              >
                Reintentar catalogos
              </button>
            }
            description={catalogError}
            title="No se pudieron cargar los agronomos"
          />
        ) : null}

        {isLoadingCatalogs ? (
          <LoadingState description="Cargando catalogo de agronomos." />
        ) : null}

        {!isLoadingCatalogs && !catalogError && catalogs ? (
          <form
            className="filter-bar"
            onSubmit={(event) => {
              event.preventDefault();
              void loadParcelas();
            }}
          >
            <label className="filter-bar__field">
              <span className="filter-bar__label">Agronomo</span>
              <select
                className="ui-select"
                onChange={(event) => setSelectedAgronomistId(event.target.value)}
                value={selectedAgronomistId}
              >
                <option value="">Selecciona un agronomo</option>
                {catalogs.agronomos.map((agronomo) => (
                  <option key={agronomo.id} value={agronomo.id}>
                    {agronomo.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-bar__actions">
              <button
                className="ui-button ui-button--primary"
                disabled={!selectedAgronomistId || isLoadingList}
                type="submit"
              >
                {isLoadingList ? "Cargando..." : "Buscar parcelas"}
              </button>
            </div>
          </form>
        ) : null}

        {listError ? (
          <ErrorState
            action={
              <button
                className="ui-button ui-button--secondary"
                onClick={() => void loadParcelas()}
                type="button"
              >
                Reintentar
              </button>
            }
            description={listError}
          />
        ) : null}

        {isLoadingList ? (
          <TableSkeleton
            columns={5}
            description="Agrupando visitas por parcela."
          />
        ) : null}

        {!isLoadingList && !listError && result ? (
          <>
            <div className="stat-grid">
              <article className="stat-card">
                <p className="stat-card__label">Agronomo</p>
                <p className="stat-card__value stat-card__value--small">
                  {result.agronomistLabel}
                </p>
              </article>
              <article className="stat-card">
                <p className="stat-card__label">Parcelas visitadas</p>
                <p className="stat-card__value">{result.parcelas.length}</p>
              </article>
              <article className="stat-card">
                <p className="stat-card__label">Total de visitas</p>
                <p className="stat-card__value">{result.totalVisitas}</p>
              </article>
            </div>

            {result.parcelas.length === 0 ? (
              <EmptyState
                description="El agronomo seleccionado no tiene visitas registradas todavia."
                title="Sin parcelas visitadas"
              />
            ) : (
              <DataTable
                caption="Parcelas visitadas por el agronomo seleccionado."
                columns={columns}
                getRowKey={(parcela) => parcela.parcelaId}
                rows={result.parcelas}
              />
            )}
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

  async function loadParcelas() {
    if (!session || !selectedAgronomistId || !catalogs) {
      return;
    }

    const agronomist = catalogs.agronomos.find(
      (option) => option.id === selectedAgronomistId
    );

    try {
      setIsLoadingList(true);
      setListError(null);
      const nextResult = await visitasService.getParcelasVisitadasByAgronomo(
        session,
        selectedAgronomistId,
        agronomist?.label ?? selectedAgronomistId
      );
      setResult(nextResult);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setListError(apiError.message);
    } finally {
      setIsLoadingList(false);
    }
  }
}

function formatDate(value: string) {
  return formatDateOnly(value);
}
