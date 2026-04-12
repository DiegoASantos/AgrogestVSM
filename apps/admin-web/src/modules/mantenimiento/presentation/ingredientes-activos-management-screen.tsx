"use client";

import Link from "next/link";
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
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { productFormulationsService } from "../services/product-formulations.service";
import type { ActiveIngredientItem } from "../types/product-formulations.types";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type ActiveIngredientFormState = {
  id: string | null;
  name: string;
  status: "active" | "inactive";
};

const emptyForm: ActiveIngredientFormState = {
  id: null,
  name: "",
  status: "active"
};

export function IngredientesActivosManagementScreen() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<ActiveIngredientItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ActiveIngredientFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<ActiveIngredientItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadIngredients();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch);

      return matchesSearch && matchesStatusFilter(item.isActive, statusFilter);
    });
  }, [items, search, statusFilter]);

  const columns: DataTableColumn<ActiveIngredientItem>[] = [
    {
      key: "name",
      header: "Ingrediente activo",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{item.id}</span>
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
          <Link
            className="ui-button ui-button--secondary ui-button--compact"
            href={`/mantenimiento/producto-ingredientes?ingredientActiveId=${item.id}`}
          >
            Formulaciones
          </Link>
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

  async function loadIngredients() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setListError(null);
      const nextItems = await productFormulationsService.getActiveIngredients(
        session
      );
      setItems(nextItems);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setListError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormError(null);
    setSuccessMessage(null);
    setFormState(emptyForm);
  }

  function handleEdit(item: ActiveIngredientItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      name: item.name,
      status: item.isActive ? "active" : "inactive"
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const name = formState.name.trim();

    if (!name) {
      setFormError("El nombre del ingrediente activo es obligatorio.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await productFormulationsService.updateActiveIngredient(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Ingrediente activo actualizado correctamente.");
      } else {
        await productFormulationsService.createActiveIngredient(session, payload);
        setSuccessMessage("Ingrediente activo creado correctamente.");
      }

      await loadIngredients();
      setFormState(emptyForm);
      setModalOpen(false);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setFormError(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateConfirm() {
    if (!session || !itemToDeactivate) {
      return;
    }

    try {
      setIsDeleting(true);
      await productFormulationsService.deleteActiveIngredient(
        session,
        itemToDeactivate.id
      );
      setSuccessMessage("Ingrediente activo desactivado correctamente.");

      if (formState.id === itemToDeactivate.id) {
        setFormState(emptyForm);
      }

      setItemToDeactivate(null);
      await loadIngredients();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setListError(apiError.message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="panel">
      <ToolbarActions
        actions={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => void loadIngredients()} type="button">
              Recargar
            </button>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.mantenimientoItems.productoIngredientes}>
              Ver formulaciones
            </Link>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nuevo ingrediente
            </button>
          </>
        }
        description="CRUD administrativo base de ingredientes activos."
        eyebrow="Mantenimiento"
        title="Ingredientes activos"
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
            placeholder="Nombre del ingrediente"
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
            <button className="ui-button ui-button--secondary" onClick={() => void loadIngredients()} type="button">
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando ingredientes activos..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay ingredientes activos cargados o los filtros no devolvieron coincidencias."
          title="No se encontraron ingredientes activos"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de ingredientes activos."
          columns={columns}
          getRowKey={(row) => row.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar ingrediente activo" : "Nuevo ingrediente activo"}
        description="Alta o edicion simple de ingredientes activos."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="ingredientes-activos-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear ingrediente"}
            </button>
          </>
        }
      >
        <form
          className="form-layout"
          id="ingredientes-activos-form"
          onSubmit={handleSubmit}
        >
          <label className="field-group">
            <span>Nombre</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Nombre del ingrediente activo"
              value={formState.name}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as ActiveIngredientFormState["status"]
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
            ? `Se desactivara el ingrediente activo ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
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
        title="Desactivar ingrediente activo"
        variant="warning"
      />
    </article>
  );
}
