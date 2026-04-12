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
import { securityService } from "../services/security.service";
import type { SecurityRoleItem } from "../types/security.types";
import { normalizeSearch } from "./security-screen.helpers";

type RoleFormState = {
  id: string | null;
  code: string;
  name: string;
  description: string;
};

const emptyForm: RoleFormState = {
  id: null,
  code: "",
  name: "",
  description: ""
};

export function RolesManagementScreen() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<SecurityRoleItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<RoleFormState>(emptyForm);
  const [itemToDelete, setItemToDelete] = useState<SecurityRoleItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadRoles();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      if (normalizedSearch.length === 0) {
        return true;
      }

      return (
        item.code.toLowerCase().includes(normalizedSearch) ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [items, search]);

  const columns: DataTableColumn<SecurityRoleItem>[] = [
    {
      key: "role",
      header: "Rol",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{item.code}</span>
        </div>
      )
    },
    {
      key: "description",
      header: "Descripcion",
      cell: (item) => item.description ?? "Sin descripcion"
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
            href={`${adminRoutes.seguridadItems.usuarioRoles}?roleId=${item.id}`}
          >
            Asignaciones
          </Link>
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

  async function loadRoles() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setListError(null);
      const nextItems = await securityService.getRoles(session);
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

  function handleEdit(item: SecurityRoleItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: String(item.id),
      code: item.code,
      name: item.name,
      description: item.description ?? ""
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const code = formState.code.trim().toUpperCase();
    const name = formState.name.trim();
    const description = formState.description.trim();

    if (!code || !name) {
      setFormError("Codigo y nombre son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        code,
        name,
        ...(description ? { description } : {})
      };

      if (formState.id) {
        await securityService.updateRole(session, formState.id, payload);
        setSuccessMessage("Rol actualizado correctamente.");
      } else {
        await securityService.createRole(session, payload);
        setSuccessMessage("Rol creado correctamente.");
      }

      await loadRoles();
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

  async function handleDeleteConfirm() {
    if (!session || !itemToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      await securityService.deleteRole(session, String(itemToDelete.id));
      setSuccessMessage("Rol eliminado correctamente.");

      if (formState.id === String(itemToDelete.id)) {
        setFormState(emptyForm);
      }

      setItemToDelete(null);
      await loadRoles();
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
            <button className="ui-button ui-button--ghost" onClick={() => void loadRoles()} type="button">
              Recargar
            </button>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.seguridadItems.usuarios}>
              Ver usuarios
            </Link>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.seguridadItems.usuarioRoles}>
              Ver asignaciones
            </Link>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nuevo rol
            </button>
          </>
        }
        description="CRUD administrativo base de roles."
        eyebrow="Seguridad"
        title="Roles"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => setSearch("")}
            type="button"
          >
            Limpiar filtro
          </button>
        }
      >
        <label className="field-group">
          <span>Buscar</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Codigo, nombre o descripcion"
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
            <button className="ui-button ui-button--secondary" onClick={() => void loadRoles()} type="button">
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando roles..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay roles cargados o el filtro no devolvio coincidencias."
          title="No se encontraron roles"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Roles administrativos."
          columns={columns}
          getRowKey={(row) => String(row.id)}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar rol" : "Nuevo rol"}
        description="Alta o edicion simple de roles."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="roles-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear rol"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="roles-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Codigo</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  code: event.target.value
                }))
              }
              placeholder="ADMIN"
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
              placeholder="Administrador"
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
              placeholder="Descripcion breve del rol"
              rows={4}
              value={formState.description}
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
            ? `Esta accion eliminara permanentemente el rol ${itemToDelete.name}. Esta operacion no se puede deshacer.`
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
        title="Confirmar eliminacion"
      />
    </article>
  );
}
