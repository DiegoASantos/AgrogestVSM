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
import type { AuthSession } from "../../auth/types/auth.types";
import type {
  OperationalCatalogItem,
  OperationalCatalogPayload
} from "../types/agricultural-catalogs.types";
import { normalizeSearch, renderStatusBadge } from "./catalog-screen.helpers";

type OperationalCatalogFormState = {
  id: string | null;
  name: string;
  description: string;
  isActive: boolean;
};

type OperationalCatalogManagementScreenProps = {
  title: string;
  description: string;
  listCaption: string;
  emptyTitle: string;
  emptyDescription: string;
  modalTitleNew: string;
  modalTitleEdit: string;
  formId: string;
  loadItems: (session: Pick<AuthSession, "accessToken" | "tokenType">) => Promise<OperationalCatalogItem[]>;
  createItem: (
    session: Pick<AuthSession, "accessToken" | "tokenType">,
    payload: OperationalCatalogPayload
  ) => Promise<OperationalCatalogItem>;
  updateItem: (
    session: Pick<AuthSession, "accessToken" | "tokenType">,
    id: string,
    payload: OperationalCatalogPayload
  ) => Promise<OperationalCatalogItem>;
  deleteItem: (
    session: Pick<AuthSession, "accessToken" | "tokenType">,
    id: string
  ) => Promise<unknown>;
};

const emptyForm: OperationalCatalogFormState = {
  id: null,
  name: "",
  description: "",
  isActive: true
};

export function OperationalCatalogManagementScreen({
  title,
  description,
  listCaption,
  emptyTitle,
  emptyDescription,
  modalTitleNew,
  modalTitleEdit,
  formId,
  loadItems,
  createItem,
  updateItem,
  deleteItem
}: OperationalCatalogManagementScreenProps) {
  const { session } = useAuthSession();
  const [items, setItems] = useState<OperationalCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formState, setFormState] =
    useState<OperationalCatalogFormState>(emptyForm);
  const [itemToDelete, setItemToDelete] =
    useState<OperationalCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadCatalogItems();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [items, search]);

  const columns: DataTableColumn<OperationalCatalogItem>[] = [
    {
      key: "name",
      header: "Nombre",
      cell: (item) => item.name
    },
    {
      key: "description",
      header: "Descripcion",
      cell: (item) => item.description || "Sin descripcion"
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
            disabled={!item.isActive}
            onClick={() => setItemToDelete(item)}
            type="button"
          >
            Desactivar
          </button>
        </div>
      )
    }
  ];

  async function loadCatalogItems() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setListError(null);

    try {
      const nextItems = await loadItems(session);
      setItems(nextItems);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: OperationalCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      isActive: item.isActive
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
    const descriptionValue = formState.description.trim();

    if (!name) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload: OperationalCatalogPayload = {
        name,
        description: descriptionValue || null,
        isActive: formState.isActive
      };

      if (formState.id) {
        await updateItem(session, formState.id, payload);
        setSuccessMessage("Registro actualizado correctamente.");
      } else {
        await createItem(session, payload);
        setSuccessMessage("Registro creado correctamente.");
      }

      await loadCatalogItems();
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
      await deleteItem(session, itemToDelete.id);
      setSuccessMessage("Registro desactivado correctamente.");
      setItemToDelete(null);
      await loadCatalogItems();
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
            <button
              className="ui-button ui-button--ghost"
              onClick={() => void loadCatalogItems()}
              type="button"
            >
              Recargar
            </button>
            <button
              className="ui-button ui-button--primary"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              type="button"
            >
              Nuevo registro
            </button>
          </>
        }
        description={description}
        eyebrow="Mantenimiento"
        title={title}
      />

      <FilterBar>
        <label className="field-group">
          <span>Buscar</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o descripcion"
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
              onClick={() => void loadCatalogItems()}
              type="button"
            >
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description={`Cargando ${title.toLowerCase()}...`} />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption={listCaption}
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => {
          resetForm();
          setModalOpen(false);
        }}
        title={formState.id ? modalTitleEdit : modalTitleNew}
        description="Alta o edicion de catalogo operativo."
        footer={
          <>
            <button
              className="ui-button ui-button--ghost"
              onClick={() => {
                resetForm();
                setModalOpen(false);
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form={formId}
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear registro"}
            </button>
          </>
        }
      >
        <form className="form-layout" id={formId} onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Nombre</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Nombre del registro"
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
              placeholder="Descripcion operativa"
              value={formState.description}
            />
          </label>

          <label className="field-group field-group--inline">
            <input
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  isActive: event.target.checked
                }))
              }
              type="checkbox"
            />
            <span>Activo</span>
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormModal>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Desactivar"
        description={
          itemToDelete
            ? `Esta accion desactivara ${itemToDelete.name}.`
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
        title="Desactivar registro"
      />
    </article>
  );
}
