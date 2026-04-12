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
  EtapaFenologicaCatalogItem
} from "../types/agricultural-catalogs.types";
import {
  buildOptionsLookup,
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type EtapaFormState = {
  id: string | null;
  cultivoId: string;
  name: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: EtapaFormState = {
  id: null,
  cultivoId: "",
  name: "",
  description: "",
  status: "active"
};

export function EtapasFenologicasManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<EtapaFenologicaCatalogItem[]>([]);
  const [cultivoOptions, setCultivoOptions] = useState<CatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cultivoFilter, setCultivoFilter] = useState("all");
  const [formState, setFormState] = useState<EtapaFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<EtapaFenologicaCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const cultivoLookup = useMemo(
    () => buildOptionsLookup(cultivoOptions),
    [cultivoOptions]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const cultivoLabel = cultivoLookup[item.cultivoId] ?? item.cultivoId;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
        cultivoLabel.toLowerCase().includes(normalizedSearch);

      const matchesCultivo =
        cultivoFilter === "all" || item.cultivoId === cultivoFilter;

      return (
        matchesSearch &&
        matchesCultivo &&
        matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [items, search, cultivoLookup, cultivoFilter, statusFilter]);

  const columns: DataTableColumn<EtapaFenologicaCatalogItem>[] = [
    {
      key: "name",
      header: "Etapa",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{cultivoLookup[item.cultivoId] ?? item.cultivoId}</span>
        </div>
      )
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
      const [nextItems, nextCultivos] = await Promise.all([
        agriculturalCatalogsService.getEtapasFenologicas(session),
        agriculturalCatalogsService.getCultivoOptions(session)
      ]);

      setItems(nextItems);
      setCultivoOptions(nextCultivos);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: EtapaFenologicaCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      cultivoId: item.cultivoId,
      name: item.name,
      description: item.description ?? "",
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

    const cultivoId = formState.cultivoId.trim();
    const name = formState.name.trim();
    const description = formState.description.trim();

    if (!cultivoId || !name) {
      setFormError("Cultivo y nombre son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        cultivoId,
        name,
        description: description || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await agriculturalCatalogsService.updateEtapaFenologica(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Etapa fenologica actualizada correctamente.");
      } else {
        await agriculturalCatalogsService.createEtapaFenologica(
          session,
          payload
        );
        setSuccessMessage("Etapa fenologica creada correctamente.");
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
      await agriculturalCatalogsService.deleteEtapaFenologica(
        session,
        itemToDeactivate.id
      );
      setSuccessMessage("Etapa fenologica desactivada correctamente.");

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
              Nueva etapa
            </button>
          </>
        }
        description="Gestion administrativa de etapas fenologicas por cultivo."
        eyebrow="Mantenimiento"
        title="Etapas fenologicas"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setCultivoFilter("all");
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
            placeholder="Nombre o descripcion"
            value={search}
          />
        </label>

        <label className="field-group">
          <span>Cultivo</span>
          <select
            onChange={(event) => setCultivoFilter(event.target.value)}
            value={cultivoFilter}
          >
            <option value="all">Todos</option>
            {cultivoOptions.map((option) => (
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
        <LoadingState description="Cargando etapas fenologicas..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay etapas registradas o los filtros no devolvieron coincidencias."
          title="No hay etapas para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de etapas fenologicas."
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar etapa fenologica" : "Nueva etapa fenologica"}
        description="Alta o edicion simple de etapas fenologicas asociadas a un cultivo."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="etapas-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear etapa"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="etapas-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Cultivo</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  cultivoId: event.target.value
                }))
              }
              value={formState.cultivoId}
            >
              <option value="">Selecciona un cultivo</option>
              {cultivoOptions.map((option) => (
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
              placeholder="Floracion"
              value={formState.name}
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
              placeholder="Descripcion breve de la etapa"
              value={formState.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as EtapaFormState["status"]
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
            ? `Se desactivara la etapa ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
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
        title="Desactivar etapa fenologica"
        variant="warning"
      />
    </article>
  );
}
