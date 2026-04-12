"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
import type {
  SecurityRoleItem,
  SecurityUserItem,
  SecurityUserRoleItem
} from "../types/security.types";
import { normalizeSearch } from "./security-screen.helpers";

type UserRoleFormState = {
  currentUserId: string | null;
  currentRoleId: string | null;
  userId: string;
  roleId: string;
};

const emptyForm: UserRoleFormState = {
  currentUserId: null,
  currentRoleId: null,
  userId: "",
  roleId: ""
};

export function UserRolesManagementScreen() {
  const searchParams = useSearchParams();
  const { session, logout } = useAuthSession();
  const [users, setUsers] = useState<SecurityUserItem[]>([]);
  const [roles, setRoles] = useState<SecurityRoleItem[]>([]);
  const [items, setItems] = useState<SecurityUserRoleItem[]>([]);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState(searchParams.get("userId") ?? "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("roleId") ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserRoleFormState>(emptyForm);
  const [itemToDelete, setItemToDelete] = useState<SecurityUserRoleItem | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setUserFilter(searchParams.get("userId") ?? "");
    setRoleFilter(searchParams.get("roleId") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.user.displayName.toLowerCase().includes(normalizedSearch) ||
        item.user.email.toLowerCase().includes(normalizedSearch) ||
        item.role.code.toLowerCase().includes(normalizedSearch) ||
        item.role.name.toLowerCase().includes(normalizedSearch);

      const matchesUser = userFilter.length === 0 || item.userId === userFilter;
      const matchesRole = roleFilter.length === 0 || item.roleId === roleFilter;

      return matchesSearch && matchesUser && matchesRole;
    });
  }, [items, roleFilter, search, userFilter]);

  const columns: DataTableColumn<SecurityUserRoleItem>[] = [
    {
      key: "user",
      header: "Usuario",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.user.displayName}</strong>
          <span>{item.user.email}</span>
        </div>
      )
    },
    {
      key: "role",
      header: "Rol",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.role.name}</strong>
          <span>{item.role.code}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Estado usuario",
      cell: (item) => (item.user.isActive ? "Activo" : "Inactivo")
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

  async function loadData() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setListError(null);
      const [nextUsers, nextRoles, nextItems] = await Promise.all([
        securityService.getUsers(session),
        securityService.getRoles(session),
        securityService.getUserRoles(session)
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
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
    setFormState({
      ...emptyForm,
      userId: searchParams.get("userId") ?? "",
      roleId: searchParams.get("roleId") ?? ""
    });
  }

  function handleEdit(item: SecurityUserRoleItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      currentUserId: item.userId,
      currentRoleId: item.roleId,
      userId: item.userId,
      roleId: item.roleId
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const userId = formState.userId.trim();
    const roleId = formState.roleId.trim();

    if (!userId || !roleId) {
      setFormError("Usuario y rol son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = { userId, roleId };

      if (formState.currentUserId && formState.currentRoleId) {
        await securityService.updateUserRole(
          session,
          formState.currentUserId,
          formState.currentRoleId,
          payload
        );
        setSuccessMessage("Asignacion usuario rol actualizada correctamente.");
      } else {
        await securityService.createUserRole(session, payload);
        setSuccessMessage("Asignacion usuario rol creada correctamente.");
      }

      await loadData();
      resetForm();
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
      await securityService.deleteUserRole(
        session,
        itemToDelete.userId,
        itemToDelete.roleId
      );
      setSuccessMessage("Asignacion usuario rol eliminada correctamente.");

      if (
        formState.currentUserId === itemToDelete.userId &&
        formState.currentRoleId === itemToDelete.roleId
      ) {
        resetForm();
      }

      setItemToDelete(null);
      await loadData();
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

  const hasBaseCatalogs = users.length > 0 && roles.length > 0;

  return (
    <article className="panel">
      <ToolbarActions
        actions={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => void loadData()} type="button">
              Recargar
            </button>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.seguridadItems.usuarios}>
              Ver usuarios
            </Link>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.seguridadItems.roles}>
              Ver roles
            </Link>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nueva asignacion
            </button>
          </>
        }
        description="Gestion simple de asignaciones entre usuarios y roles."
        eyebrow="Seguridad"
        title="Asignacion de roles"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setUserFilter("");
              setRoleFilter("");
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
            placeholder="Usuario o rol"
            value={search}
          />
        </label>

        <label className="field-group">
          <span>Usuario</span>
          <select
            onChange={(event) => setUserFilter(event.target.value)}
            value={userFilter}
          >
            <option value="">Todos</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group">
          <span>Rol</span>
          <select
            onChange={(event) => setRoleFilter(event.target.value)}
            value={roleFilter}
          >
            <option value="">Todos</option>
            {roles.map((role) => (
              <option key={role.id} value={String(role.id)}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      {successMessage ? (
        <FeedbackBanner kind="success" message={successMessage} />
      ) : null}

      {listError ? (
        <ErrorState
          action={
            <button className="ui-button ui-button--secondary" onClick={() => void loadData()} type="button">
              Reintentar
            </button>
          }
          description={listError}
        />
      ) : null}

      {!listError && isLoading ? (
        <LoadingState description="Cargando usuarios, roles y asignaciones..." />
      ) : null}

      {!listError && !isLoading && !hasBaseCatalogs ? (
        <EmptyState
          description="Necesitas al menos un usuario y un rol para registrar asignaciones."
          title="Catalogos base incompletos"
        />
      ) : null}

      {!listError && !isLoading && hasBaseCatalogs && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay asignaciones registradas o los filtros no devolvieron coincidencias."
          title="Sin asignaciones"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Asignaciones usuario rol."
          columns={columns}
          getRowKey={(row) => `${row.userId}-${row.roleId}`}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={
          formState.currentUserId && formState.currentRoleId
            ? "Editar asignacion"
            : "Nueva asignacion"
        }
        description="Crea o edita una asignacion simple entre usuario y rol."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving || !hasBaseCatalogs}
              form="usuario-roles-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.currentUserId && formState.currentRoleId
                  ? "Guardar cambios"
                  : "Crear asignacion"}
            </button>
          </>
        }
      >
        <form
          className="form-layout"
          id="usuario-roles-form"
          onSubmit={handleSubmit}
        >
          <label className="field-group">
            <span>Usuario</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  userId: event.target.value
                }))
              }
              value={formState.userId}
            >
              <option value="">Selecciona un usuario</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Rol</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  roleId: event.target.value
                }))
              }
              value={formState.roleId}
            >
              <option value="">Selecciona un rol</option>
              {roles.map((role) => (
                <option key={role.id} value={String(role.id)}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormModal>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Eliminar permanentemente"
        description={
          itemToDelete
            ? "Esta accion eliminara permanentemente esta asignacion. Esta operacion no se puede deshacer."
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
