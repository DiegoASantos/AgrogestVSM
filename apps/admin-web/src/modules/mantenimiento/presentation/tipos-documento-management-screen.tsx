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
import type { TipoDocumentoCatalogItem } from "../types/agricultural-catalogs.types";
import { normalizeSearch } from "./catalog-screen.helpers";

type TipoDocumentoFormState = {
  id: string | null;
  code: string;
  name: string;
};

const emptyForm: TipoDocumentoFormState = {
  id: null,
  code: "",
  name: ""
};

export function TiposDocumentoManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<TipoDocumentoCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<TipoDocumentoFormState>(emptyForm);
  const [itemToDelete, setItemToDelete] =
    useState<TipoDocumentoCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadItems();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      if (normalizedSearch.length === 0) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.code.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [items, search]);

  const columns: DataTableColumn<TipoDocumentoCatalogItem>[] = [
    {
      key: "name",
      header: "Nombre",
      cell: (item) => item.name
    },
    {
      key: "code",
      header: "Codigo",
      cell: (item) => item.code
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

  async function loadItems() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setListError(null);

    try {
      const nextItems = await agriculturalCatalogsService.getTiposDocumento(
        session
      );
      setItems(nextItems);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: TipoDocumentoCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      code: item.code,
      name: item.name
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

    const code = formState.code.trim().toUpperCase();
    const name = formState.name.trim();

    if (!code || !name) {
      setFormError("Codigo y nombre son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = { code, name };

      if (formState.id) {
        await agriculturalCatalogsService.updateTipoDocumento(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Tipo de documento actualizado correctamente.");
      } else {
        await agriculturalCatalogsService.createTipoDocumento(session, payload);
        setSuccessMessage("Tipo de documento creado correctamente.");
      }

      await loadItems();
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
      await agriculturalCatalogsService.deleteTipoDocumento(
        session,
        itemToDelete.id
      );
      setSuccessMessage("Tipo de documento eliminado correctamente.");

      if (formState.id === itemToDelete.id) {
        setFormState(emptyForm);
      }

      setItemToDelete(null);
      await loadItems();
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
            <button className="ui-button ui-button--ghost" onClick={() => void loadItems()} type="button">
              Recargar
            </button>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nuevo tipo
            </button>
          </>
        }
        description="Gestion administrativa de tipos de documento."
        eyebrow="Mantenimiento"
        title="Tipos de documento"
      />

      <FilterBar>
        <label className="field-group">
          <span>Buscar</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o codigo"
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
              onClick={() => void loadItems()}
              type="button"
            >
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando tipos de documento..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay tipos registrados o la busqueda no devolvio coincidencias."
          title="No hay tipos de documento para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de tipos de documento."
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar tipo de documento" : "Nuevo tipo de documento"}
        description="Alta o edicion simple de tipos de documento."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="tipos-documento-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear tipo"}
            </button>
          </>
        }
      >
        <form
          className="form-layout"
          id="tipos-documento-form"
          onSubmit={handleSubmit}
        >
          <label className="field-group">
            <span>Codigo</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  code: event.target.value
                }))
              }
              placeholder="DNI"
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
              placeholder="Documento Nacional de Identidad"
              value={formState.name}
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
            ? `Esta accion eliminara permanentemente el tipo ${itemToDelete.name}. Esta operacion no se puede deshacer.`
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
        title="Eliminar tipo de documento"
      />
    </article>
  );
}
