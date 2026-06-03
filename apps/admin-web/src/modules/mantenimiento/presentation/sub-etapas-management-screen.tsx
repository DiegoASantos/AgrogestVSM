"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ConfirmDialog } from "../../../shared/components/confirm-dialog";
import { DataTable, type DataTableColumn } from "../../../shared/components/data-table";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { FeedbackBanner } from "../../../shared/components/feedback-banner";
import { FilterBar } from "../../../shared/components/filter-bar";
import { FormModal } from "../../../shared/components/form-modal";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { agriculturalCatalogsService } from "../services/agricultural-catalogs.service";
import type {
  CatalogOption,
  EtapaFenologicaCatalogItem,
  SubEtapaCatalogItem
} from "../types/agricultural-catalogs.types";
import {
  buildOptionsLookup,
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type SubEtapaFormState = {
  id: string | null;
  etapaFenologicaId: string;
  name: string;
  sortOrder: string;
  description: string;
  percentage: string;
  status: "active" | "inactive";
};

const emptyForm: SubEtapaFormState = {
  id: null,
  etapaFenologicaId: "",
  name: "",
  sortOrder: "",
  description: "",
  percentage: "",
  status: "active"
};

export function SubEtapasManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<SubEtapaCatalogItem[]>([]);
  const [etapas, setEtapas] = useState<EtapaFenologicaCatalogItem[]>([]);
  const [etapaOptions, setEtapaOptions] = useState<CatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [etapaFilter, setEtapaFilter] = useState("all");
  const [formState, setFormState] = useState<SubEtapaFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<SubEtapaCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const etapaLookup = useMemo(
    () => buildOptionsLookup(etapaOptions),
    [etapaOptions]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const etapaLabel = etapaLookup[item.etapaFenologicaId] ?? item.etapaFenologicaId;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        etapaLabel.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
        String(item.sortOrder).includes(normalizedSearch) ||
        String(item.percentage ?? "").includes(normalizedSearch);

      const matchesEtapa =
        etapaFilter === "all" || item.etapaFenologicaId === etapaFilter;

      return (
        matchesSearch &&
        matchesEtapa &&
        matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [items, search, etapaLookup, etapaFilter, statusFilter]);

  const columns: DataTableColumn<SubEtapaCatalogItem>[] = [
    {
      key: "name",
      header: "Sub etapa",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{etapaLookup[item.etapaFenologicaId] ?? item.etapaFenologicaId}</span>
        </div>
      )
    },
    {
      key: "sortOrder",
      header: "Orden",
      cell: (item) => item.sortOrder
    },
    {
      key: "percentage",
      header: "Porcentaje",
      cell: (item) => (item.percentage === null ? "Sin porcentaje" : `${item.percentage}%`)
    },
    {
      key: "description",
      header: "Descripcion",
      cell: (item) => item.description ?? "Sin descripcion"
    },
    {
      key: "status",
      header: "Estado",
      cell: (item) => renderStatusBadge(item.isActive)
    },
    {
      key: "actions",
      header: "Acciones",
      className: "data-table__actions",
      cell: (item) => (
        <div className="table-actions">
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => handleEdit(item)}
            type="button"
          >
            Editar
          </button>
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => setItemToDeactivate(item)}
            type="button"
          >
            Desactivar
          </button>
        </div>
      )
    }
  ];

  async function loadData() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setListError(null);

    try {
      const [nextItems, nextEtapas] = await Promise.all([
        agriculturalCatalogsService.getSubEtapas(session),
        agriculturalCatalogsService.getEtapasFenologicas(session)
      ]);
      const stageEtapas = nextEtapas.filter((etapa) => etapa.type === "Etapa");

      setItems(nextItems);
      setEtapas(stageEtapas);
      setEtapaOptions(
        stageEtapas.map((etapa) => ({
          id: etapa.id,
          label:
            etapa.sortOrder === null
              ? etapa.name
              : `${etapa.sortOrder} - ${etapa.name}`
        }))
      );
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: SubEtapaCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      etapaFenologicaId: item.etapaFenologicaId,
      name: item.name,
      sortOrder: String(item.sortOrder),
      description: item.description ?? "",
      percentage: item.percentage === null ? "" : String(item.percentage),
      status: item.isActive ? "active" : "inactive"
    });
    setModalOpen(true);
  }

  function resetForm() {
    setFormError(null);
    setSuccessMessage(null);
    setFormState(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const etapaFenologicaId = formState.etapaFenologicaId.trim();
    const name = formState.name.trim();
    const description = formState.description.trim();
    const sortOrder = Number(formState.sortOrder);
    const percentage = formState.percentage.trim()
      ? Number(formState.percentage)
      : null;

    if (!etapaFenologicaId || !name || !formState.sortOrder.trim()) {
      setFormError("Etapa, nombre y orden son obligatorios.");
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
      setFormError("El orden debe ser un entero mayor o igual a 1.");
      return;
    }

    if (
      percentage !== null &&
      (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    ) {
      setFormError("El porcentaje debe estar entre 0 y 100.");
      return;
    }

    const selectedEtapa = etapas.find((etapa) => etapa.id === etapaFenologicaId);

    if (!selectedEtapa || selectedEtapa.type !== "Etapa") {
      setFormError("Solo se puede seleccionar una etapa con tipo Etapa.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        etapaFenologicaId,
        name,
        sortOrder,
        description: description || null,
        percentage,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await agriculturalCatalogsService.updateSubEtapa(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Sub etapa actualizada correctamente.");
      } else {
        await agriculturalCatalogsService.createSubEtapa(session, payload);
        setSuccessMessage("Sub etapa creada correctamente.");
      }

      await loadData();
      setFormState(emptyForm);
      setModalOpen(false);
    } catch (error) {
      setFormError(toApiError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateConfirm() {
    if (!session || !itemToDeactivate) {
      return;
    }

    setIsDeleting(true);

    try {
      await agriculturalCatalogsService.deleteSubEtapa(
        session,
        itemToDeactivate.id
      );
      setSuccessMessage("Sub etapa desactivada correctamente.");

      if (formState.id === itemToDeactivate.id) {
        setFormState(emptyForm);
      }

      setItemToDeactivate(null);
      await loadData();
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="panel">
      <ToolbarActions
        actions={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => void loadData()} type="button">
              Recargar
            </button>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nueva sub etapa
            </button>
          </>
        }
        description="Gestion administrativa de sub etapas por etapa fenologica."
        eyebrow="Mantenimiento"
        title="Sub etapas"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setEtapaFilter("all");
            }}
            type="button"
          >
            Limpiar filtros
          </button>
        }
      >
        <label className="field-group">
          <span>Buscar</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, descripcion, orden o porcentaje"
            value={search}
          />
        </label>

        <label className="field-group">
          <span>Etapa</span>
          <select
            onChange={(event) => setEtapaFilter(event.target.value)}
            value={etapaFilter}
          >
            <option value="all">Todas</option>
            {etapaOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group">
          <span>Estado</span>
          <select
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            value={statusFilter}
          >
            <option value="all">Todos</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </label>
      </FilterBar>

      {successMessage ? (
        <FeedbackBanner kind="success" message={successMessage} />
      ) : null}

      {listError ? (
        <ErrorState
          action={
            <button
              className="ui-button ui-button--secondary"
              onClick={() => void loadData()}
              type="button"
            >
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando sub etapas..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay sub etapas registradas o los filtros no devolvieron coincidencias."
          title="No hay sub etapas para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de sub etapas."
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar sub etapa" : "Nueva sub etapa"}
        description="Alta o edicion simple de sub etapas asociadas a etapas fenologicas."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="sub-etapas-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear sub etapa"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="sub-etapas-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Etapa</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  etapaFenologicaId: event.target.value
                }))
              }
              value={formState.etapaFenologicaId}
            >
              <option value="">Selecciona una etapa</option>
              {etapaOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Nombre</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Boton floral"
              value={formState.name}
            />
          </label>

          <label className="field-group">
            <span>Orden</span>
            <input
              min={1}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  sortOrder: event.target.value
                }))
              }
              placeholder="1"
              type="number"
              value={formState.sortOrder}
            />
          </label>

          <label className="field-group">
            <span>Porcentaje</span>
            <input
              max={100}
              min={0}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  percentage: event.target.value
                }))
              }
              placeholder="25"
              step="0.01"
              type="number"
              value={formState.percentage}
            />
          </label>

          <label className="field-group">
            <span>Descripcion</span>
            <textarea
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  description: event.target.value
                }))
              }
              placeholder="Descripcion breve de la sub etapa"
              value={formState.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as SubEtapaFormState["status"]
                }))
              }
              value={formState.status}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </label>
        </form>
        {formError ? <p className="form-error">{formError}</p> : null}
      </FormModal>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Desactivar"
        description={
          itemToDeactivate
            ? `Se desactivara la sub etapa ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
            : ""
        }
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setItemToDeactivate(null);
          }
        }}
        onConfirm={() => void handleDeactivateConfirm()}
        open={itemToDeactivate !== null}
        title="Desactivar sub etapa"
        variant="warning"
      />
    </article>
  );
}
