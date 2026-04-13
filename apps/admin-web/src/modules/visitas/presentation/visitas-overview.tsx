"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { FilterBar } from "../../../shared/components/filter-bar";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { VisitasTable } from "./visitas-table";
import { visitasService } from "../services/visitas.service";
import type {
  AgronomistFilterOption,
  CampaignFilterOption,
  ParcelaFilterOption,
  ProductorFilterOption,
  VisitaCampo,
  VisitaFilterCatalogs,
  VisitaListFilters
} from "../types/visitas.types";

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

    void loadVisitas(appliedFilters);
  }, [appliedFilters, session]);

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
                onClick={() => void loadVisitas(appliedFilters)}
                type="button"
              >
                Recargar
              </button>
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
          description="Listado administrativo de visitas de campo con filtros operativos simples."
          eyebrow="Visitas"
          title="Gestion administrativa de visitas"
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
            <span>Productor</span>
            <select
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  productorId: event.target.value
                }))
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
            <span>Campania</span>
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
            <span>Parcela</span>
            <select
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  parcelaId: event.target.value
                }))
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
          <LoadingState description="Cargando productores, campanias y parcelas para los filtros." />
        ) : null}

        {listError ? (
          <ErrorState
            action={
              <button className="ui-button ui-button--secondary" onClick={() => void loadVisitas(appliedFilters)} type="button">
                Reintentar listado
              </button>
            }
            description={listError}
          />
        ) : null}

        {!listError && isLoadingList ? (
          <LoadingState description="Cargando visitas segun los filtros administrativos seleccionados." />
        ) : null}

        {!listError && !isLoadingList && items.length === 0 ? (
          <EmptyState
            description="No hay visitas para los filtros actuales. Puedes limpiar el formulario o ajustar el rango de fechas."
            title="No se encontraron visitas"
          />
        ) : null}

        {!listError && !isLoadingList && items.length > 0 ? (
          <>
            <p className="body-copy visitas-results-copy">
              {count} visita{count === 1 ? "" : "s"} encontrada{count === 1 ? "" : "s"}.
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
              items={items}
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

  async function loadVisitas(filters: VisitaListFilters) {
    if (!session) {
      return;
    }

    try {
      setIsLoadingList(true);
      setListError(null);
      const response = await visitasService.getList(session, filters);
      setItems(response.items);
      setCount(response.count);
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
  options:
    | ProductorFilterOption[]
    | CampaignFilterOption[]
    | ParcelaFilterOption[]
    | AgronomistFilterOption[]
) {
  return new Map(options.map((option) => [option.id, option.label]));
}
