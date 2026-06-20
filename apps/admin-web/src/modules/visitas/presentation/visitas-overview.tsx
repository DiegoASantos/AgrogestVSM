"use client";

import { Calendar, Filter, Map, Search, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { TableSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { VisitasTable } from "./visitas-table";
import { visitasService } from "../services/visitas.service";
import type {
  VisitaCampo,
  VisitaFilterCatalogs,
  VisitaListFilters
} from "../types/visitas.types";

const PAGE_SIZE = 30;

const emptyFilters: VisitaListFilters = {
  agronomistUserId: "",
  productorId: "",
  campaignId: "",
  parcelaId: "",
  startDate: "",
  endDate: ""
};

export function VisitasOverview() {
  const { session, logout } = useAuthSession();
  const [draftFilters, setDraftFilters] = useState<VisitaListFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<VisitaListFilters>(emptyFilters);
  const [catalogs, setCatalogs] = useState<VisitaFilterCatalogs | null>(null);
  const [items, setItems] = useState<VisitaCampo[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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

    void loadVisitas(appliedFilters, page);
  }, [appliedFilters, page, session]);

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
  const toItem = Math.min(page * PAGE_SIZE, count);
  const resultsSummary = `${count} visita${count === 1 ? "" : "s"} encontrada${count === 1 ? "" : "s"}${
    totalPages > 1 ? ` -- Mostrando ${fromItem} - ${toItem}` : ""
  }.`;

  return (
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <>
              <Link
                className="ui-button ui-button--ghost"
                href={buildAdminMapHref({
                  productorId: appliedFilters.productorId,
                  parcelaId: appliedFilters.parcelaId,
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
                href="/visitas/parcelas-visitadas"
              >
                Parcelas visitadas por agronomo
              </Link>
              <Link className="ui-button ui-button--secondary" href={adminRoutes.dashboard}>
                Volver a dashboard
              </Link>
            </>
          }
          description="Listado administrativo de visitas de campo con filtros operativos."
          eyebrow="Visitas"
          title="Gestion administrativa de visitas"
        />

        <div className="filter-card filter-card--visitas">
          <div className="filter-card__header">
            <Filter size={16} />
            <span>Filtros de busqueda</span>
          </div>
          <div className="filter-card__body">
            <label className="field-group">
              <span className="field-group__label">
                <User size={13} />
                Agronomo
              </span>
              <select
                onChange={(event) =>
                  updateDraft("agronomistUserId", event.target.value)
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
              <span className="field-group__label">
                <Search size={13} />
                Productor
              </span>
              <select
                onChange={(event) =>
                  updateDraft("productorId", event.target.value)
                }
                value={draftFilters.productorId}
              >
                <option value="">Todos</option>
                {(catalogs?.productores ?? []).map((productor) => (
                  <option key={productor.id} value={productor.id}>
                    {productor.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="field-group__label">Campaña</span>
              <select
                onChange={(event) =>
                  updateDraft("campaignId", event.target.value)
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
              <span className="field-group__label">Parcela</span>
              <select
                onChange={(event) =>
                  updateDraft("parcelaId", event.target.value)
                }
                value={draftFilters.parcelaId}
              >
                <option value="">Todas</option>
                {(catalogs?.parcelas ?? []).map((parcela) => (
                  <option key={parcela.id} value={parcela.id}>
                    {parcela.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="field-group__label">
                <Calendar size={13} />
                Fecha desde
              </span>
              <input
                onChange={(event) =>
                  updateDraft("startDate", event.target.value)
                }
                type="date"
                value={draftFilters.startDate}
              />
            </label>

            <label className="field-group">
              <span className="field-group__label">
                <Calendar size={13} />
                Fecha hasta
              </span>
              <input
                onChange={(event) =>
                  updateDraft("endDate", event.target.value)
                }
                type="date"
                value={draftFilters.endDate}
              />
            </label>
          </div>
          {validationError ? <p className="form-error">{validationError}</p> : null}
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
          <LoadingState description="Cargando productores, campañas y parcelas para los filtros." />
        ) : null}

        {listError ? (
          <ErrorState
            action={
              <button className="ui-button ui-button--secondary" onClick={() => void loadVisitas(appliedFilters, page)} type="button">
                Reintentar listado
              </button>
            }
            description={listError}
          />
        ) : null}

        {!listError && isLoadingList ? (
          <TableSkeleton
            columns={7}
            description="Cargando visitas segun los filtros administrativos seleccionados."
          />
        ) : null}

        {!listError && !isLoadingList && items.length === 0 ? (
          <EmptyState
            description="No hay visitas para los filtros actuales. Puedes limpiar el formulario o ajustar el rango de fechas."
            title="No se encontraron visitas"
          />
        ) : null}

        {!listError && !isLoadingList && items.length > 0 ? (
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
            items={items}
            pagination={{
              loading: isLoadingList,
              onPageChange: handlePageChange,
              page,
              summary: resultsSummary,
              totalPages
            }}
            parcelaLabels={parcelaLabels}
          />
        ) : null}
      </article>
    </section>
  );

  function updateDraft(key: keyof VisitaListFilters, value: string) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

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

  async function loadVisitas(filters: VisitaListFilters, currentPage: number) {
    if (!session) {
      return;
    }

    try {
      setIsLoadingList(true);
      setListError(null);
      const response = await visitasService.getList(session, filters, currentPage, PAGE_SIZE);
      setItems(response.items);
      setCount(response.count);
      setTotalPages(response.totalPages);
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

function createOptionLabelMap(
  options: readonly { id: string; label: string }[]
) {
  return new globalThis.Map(options.map((option) => [option.id, option.label]));
}
