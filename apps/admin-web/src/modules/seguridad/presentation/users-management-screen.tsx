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
import type { SecurityUserItem } from "../types/security.types";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./security-screen.helpers";

type UserFormState = {
  id: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  status: "active" | "inactive";
};

const emptyForm: UserFormState = {
  id: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  status: "active"
};

export function UsersManagementScreen() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<SecurityUserItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] = useState<SecurityUserItem | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadUsers();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const rolesSummary = item.roles
        .map((role) => `${role.code} ${role.name}`.toLowerCase())
        .join(" ");

      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.displayName.toLowerCase().includes(normalizedSearch) ||
        item.email.toLowerCase().includes(normalizedSearch) ||
        (item.phone ?? "").toLowerCase().includes(normalizedSearch) ||
        rolesSummary.includes(normalizedSearch);

      return matchesSearch && matchesStatusFilter(item.isActive, statusFilter);
    });
  }, [items, search, statusFilter]);

  const columns: DataTableColumn<SecurityUserItem>[] = [
    {
      key: "user",
      header: "Usuario",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.displayName}</strong>
          <span>{item.email}</span>
        </div>
      )
    },
    {
      key: "phone",
      header: "Telefono",
      cell: (item) => item.phone ?? "Sin telefono"
    },
    {
      key: "roles",
      header: "Roles",
      cell: (item) =>
        item.roles.length > 0
          ? item.roles.map((role) => role.name).join(", ")
          : "Sin roles"
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
            href={`${adminRoutes.seguridadItems.usuarioRoles}?userId=${item.id}`}
          >
            Asignaciones
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

  async function loadUsers() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setListError(null);
      const nextItems = await securityService.getUsers(session);
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

  function handleEdit(item: SecurityUserItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone ?? "",
      password: "",
      status: item.isActive ? "active" : "inactive"
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const firstName = formState.firstName.trim();
    const lastName = formState.lastName.trim();
    const email = formState.email.trim().toLowerCase();
    const phone = formState.phone.trim();
    const password = formState.password.trim();

    if (!firstName || !lastName || !email) {
      setFormError("Nombres, apellidos y correo son obligatorios.");
      return;
    }

    if (!formState.id && !password) {
      setFormError("La clave es obligatoria para crear usuarios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        firstName,
        lastName,
        email,
        ...(phone ? { phone } : {}),
        ...(password ? { password } : {}),
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await securityService.updateUser(session, formState.id, payload);
        setSuccessMessage("Usuario actualizado correctamente.");
      } else {
        await securityService.createUser(session, payload);
        setSuccessMessage("Usuario creado correctamente.");
      }

      await loadUsers();
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
      await securityService.deleteUser(session, itemToDeactivate.id);
      setSuccessMessage("Usuario desactivado correctamente.");

      if (formState.id === itemToDeactivate.id) {
        setFormState(emptyForm);
      }

      setItemToDeactivate(null);
      await loadUsers();
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
            <button className="ui-button ui-button--ghost" onClick={() => void loadUsers()} type="button">
              Recargar
            </button>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.seguridadItems.roles}>
              Ver roles
            </Link>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.seguridadItems.usuarioRoles}>
              Ver asignaciones
            </Link>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nuevo usuario
            </button>
          </>
        }
        description="Gestion administrativa base de usuarios del sistema."
        eyebrow="Seguridad"
        title="Usuarios"
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
            placeholder="Nombre, correo, telefono o rol"
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
            <button className="ui-button ui-button--secondary" onClick={() => void loadUsers()} type="button">
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando usuarios..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay usuarios cargados o los filtros no devolvieron coincidencias."
          title="No se encontraron usuarios"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Usuarios administrativos."
          columns={columns}
          getRowKey={(row) => row.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar usuario" : "Nuevo usuario"}
        description="Alta o edicion simple de usuarios."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="usuarios-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="usuarios-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Nombres</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  firstName: event.target.value
                }))
              }
              placeholder="Nombres del usuario"
              value={formState.firstName}
            />
          </label>

          <label className="field-group">
            <span>Apellidos</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  lastName: event.target.value
                }))
              }
              placeholder="Apellidos del usuario"
              value={formState.lastName}
            />
          </label>

          <label className="field-group">
            <span>Correo</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  email: event.target.value
                }))
              }
              placeholder="correo@agrogest.local"
              type="email"
              value={formState.email}
            />
          </label>

          <label className="field-group">
            <span>Telefono</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  phone: event.target.value
                }))
              }
              placeholder="999888777"
              value={formState.phone}
            />
          </label>

          <label className="field-group">
            <span>{formState.id ? "Nueva clave opcional" : "Clave"}</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  password: event.target.value
                }))
              }
              placeholder="Minimo 6 caracteres"
              type="password"
              value={formState.password}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as UserFormState["status"]
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
            ? `Se desactivara el usuario ${itemToDeactivate.displayName}. Podra reactivarse mas adelante.`
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
        title="Confirmar desactivacion"
        variant="warning"
      />
    </article>
  );
}
