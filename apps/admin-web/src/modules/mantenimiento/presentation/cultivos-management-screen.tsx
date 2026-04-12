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
import type { CultivoCatalogItem } from "../types/agricultural-catalogs.types";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type CultivoFormState = {
  id: string | null;
  code: string;
  name: string;
  status: "active" | "inactive";
};

const emptyForm: CultivoFormState = {
  id: null,
  code: "",
  name: "",
  status: "active"
};

export function CultivosManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<CultivoCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formState, setFormState] = useState<CultivoFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<CultivoCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadCultivos();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.code ?? "").toLowerCase().includes(normalizedSearch);

      return matchesSearch && matchesStatusFilter(item.isActive, statusFilter);
    });
  }, [items, search, statusFilter]);

  const columns: DataTableColumn<CultivoCatalogItem>[] = [
    {
      key: "name",
      header: "Nombre",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{item.code ?? "Sin codigo"}</span>
        </div>
      )
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

  async function loadCultivos() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setListError(null);

    try {
      const nextItems = await agriculturalCatalogsService.getCultivos(session);
      setItems(nextItems);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: CultivoCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      code: item.code ?? "",
      name: item.name,
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

    const name = formState.name.trim();
    const code = formState.code.trim().toUpperCase();

    if (!name) {
      setFormError("El nombre del cultivo es obligatorio.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        code: code || null,
        name,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await agriculturalCatalogsService.updateCultivo(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Cultivo actualizado correctamente.");
      } else {
        await agriculturalCatalogsService.createCultivo(session, payload);
        setSuccessMessage("Cultivo creado correctamente.");
      }

      await loadCultivos();
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
      await agriculturalCatalogsService.deleteCultivo(session, itemToDeactivate.id);
      setSuccessMessage("Cultivo desactivado correctamente.");

      if (formState.id === itemToDeactivate.id) {
        setFormState(emptyForm);
      }

      setItemToDeactivate(null);
      await loadCultivos();
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
            <button className="ui-button ui-button--ghost" onClick={() => void loadCultivos()} type="button">
              Recargar
            </button>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nuevo cultivo
            </button>
          </>
        }
        description="Catalogo base para administrar cultivos del sistema."
        eyebrow="Mantenimiento"
        title="Cultivos"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
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
            placeholder="Nombre o codigo"
            value={search}
          />
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
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
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
              onClick={() => void loadCultivos()}
              type="button"
            >
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando catalogo de cultivos..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay cultivos cargados o los filtros no devolvieron coincidencias."
          title="No hay cultivos para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de cultivos."
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar cultivo" : "Nuevo cultivo"}
        description="Usa este formulario para crear o editar un cultivo."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="cultivos-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear cultivo"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="cultivos-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Codigo</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  code: event.target.value
                }))
              }
              placeholder="ARROZ"
              value={formState.code}
            />
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
              placeholder="Nombre del cultivo"
              value={formState.name}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as CultivoFormState["status"]
                }))
              }
              value={formState.status}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormModal>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Desactivar"
        description={
          itemToDeactivate
            ? `Se desactivara el cultivo ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
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
        title="Desactivar cultivo"
        variant="warning"
      />
    </article>
  );
}
