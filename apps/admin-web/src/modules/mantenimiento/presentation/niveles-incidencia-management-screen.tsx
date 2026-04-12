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
import type { NivelIncidenciaCatalogItem } from "../types/agricultural-catalogs.types";
import { normalizeSearch } from "./catalog-screen.helpers";

type NivelFormState = {
  id: string | null;
  name: string;
  sortOrder: string;
};

const emptyForm: NivelFormState = {
  id: null,
  name: "",
  sortOrder: ""
};

export function NivelesIncidenciaManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<NivelIncidenciaCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<NivelFormState>(emptyForm);
  const [itemToDelete, setItemToDelete] =
    useState<NivelIncidenciaCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadLevels();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      if (normalizedSearch.length === 0) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        String(item.sortOrder).includes(normalizedSearch)
      );
    });
  }, [items, search]);

  const columns: DataTableColumn<NivelIncidenciaCatalogItem>[] = [
    {
      key: "name",
      header: "Nombre",
      cell: (item) => item.name
    },
    {
      key: "sortOrder",
      header: "Orden",
      cell: (item) => item.sortOrder
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
            onClick={() => setItemToDelete(item)}
            type="button"
          >
            Eliminar
          </button>
        </div>
      )
    }
  ];

  async function loadLevels() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setListError(null);

    try {
      const nextItems = await agriculturalCatalogsService.getNivelesIncidencia(
        session
      );
      setItems(nextItems);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: NivelIncidenciaCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      name: item.name,
      sortOrder: String(item.sortOrder)
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
    const sortOrder = Number(formState.sortOrder);

    if (!name || !Number.isInteger(sortOrder) || sortOrder < 1) {
      setFormError("Nombre y orden valido son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name,
        sortOrder
      };

      if (formState.id) {
        await agriculturalCatalogsService.updateNivelIncidencia(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Nivel de incidencia actualizado correctamente.");
      } else {
        await agriculturalCatalogsService.createNivelIncidencia(session, payload);
        setSuccessMessage("Nivel de incidencia creado correctamente.");
      }

      await loadLevels();
      setFormState(emptyForm);
      setModalOpen(false);
    } catch (error) {
      setFormError(toApiError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!session || !itemToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await agriculturalCatalogsService.deleteNivelIncidencia(
        session,
        itemToDelete.id
      );
      setSuccessMessage("Nivel de incidencia eliminado correctamente.");

      if (formState.id === itemToDelete.id) {
        setFormState(emptyForm);
      }

      setItemToDelete(null);
      await loadLevels();
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
            <button className="ui-button ui-button--ghost" onClick={() => void loadLevels()} type="button">
              Recargar
            </button>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nuevo nivel
            </button>
          </>
        }
        description="Gestion administrativa de niveles de incidencia."
        eyebrow="Mantenimiento"
        title="Niveles de incidencia"
      />

      <FilterBar>
        <label className="field-group">
          <span>Buscar</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o orden"
            value={search}
          />
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
              onClick={() => void loadLevels()}
              type="button"
            >
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando niveles de incidencia..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay niveles registrados o la busqueda no devolvio coincidencias."
          title="No hay niveles para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de niveles de incidencia."
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar nivel de incidencia" : "Nuevo nivel de incidencia"}
        description="Alta o edicion simple de niveles con su valor de orden."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="niveles-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear nivel"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="niveles-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Nombre</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Moderado"
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

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormModal>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Eliminar permanentemente"
        description={
          itemToDelete
            ? `Esta accion eliminara permanentemente el nivel ${itemToDelete.name}. Esta operacion no se puede deshacer.`
            : ""
        }
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setItemToDelete(null);
          }
        }}
        onConfirm={() => void handleDeleteConfirm()}
        open={itemToDelete !== null}
        title="Eliminar nivel de incidencia"
      />
    </article>
  );
}
