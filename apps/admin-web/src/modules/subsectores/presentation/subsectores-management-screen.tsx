"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "../../mantenimiento/presentation/catalog-screen.helpers";
import { sectoresService } from "../../sectores/services/sectores.service";
import type { SectorListItem } from "../../sectores/types/sectores.types";
import { subsectoresService } from "../services/subsectores.service";
import type { SubsectorListItem } from "../types/subsectores.types";
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

type SubsectorFormState = {
  id: string | null;
  sectorId: string;
  name: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: SubsectorFormState = {
  id: null,
  sectorId: "",
  name: "",
  description: "",
  status: "active"
};

export function SubsectoresManagementScreen() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<SubsectorListItem[]>([]);
  const [sectores, setSectores] = useState<SectorListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<SubsectorFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<SubsectorListItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const sectoresLookup = useMemo(
    () =>
      sectores.reduce<Record<string, string>>((accumulator, sector) => {
        accumulator[sector.id] = sector.name;
        return accumulator;
      }, {}),
    [sectores]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const sectorLabel = sectoresLookup[item.sectorId] ?? item.sectorId;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
        sectorLabel.toLowerCase().includes(normalizedSearch);
      const matchesSector =
        sectorFilter.length === 0 || item.sectorId === sectorFilter;

      return (
        matchesSearch &&
        matchesSector &&
        matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [items, search, sectorFilter, sectoresLookup, statusFilter]);

  const columns: DataTableColumn<SubsectorListItem>[] = [
    {
      key: "subsector",
      header: "Subsector",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{item.description || "Sin descripcion"}</span>
        </div>
      )
    },
    {
      key: "sector",
      header: "Sector",
      cell: (item) => (
        <div className="table-copy">
          <strong>{sectoresLookup[item.sectorId] ?? `ID ${item.sectorId}`}</strong>
          <span>{item.sectorId}</span>
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

  async function loadData() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setListError(null);
      const [nextItems, nextSectores] = await Promise.all([
        subsectoresService.getAll(session),
        sectoresService.getAll(session)
      ]);
      setItems(nextItems);
      setSectores(nextSectores);
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

  function handleEdit(item: SubsectorListItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      sectorId: item.sectorId,
      name: item.name,
      description: item.description ?? "",
      status: item.isActive ? "active" : "inactive"
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const sectorId = formState.sectorId.trim();
    const name = formState.name.trim();
    const description = formState.description.trim();

    if (!sectorId || !name) {
      setFormError("Sector y nombre del subsector son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        sectorId,
        name,
        description: description || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await subsectoresService.update(session, formState.id, payload);
        setSuccessMessage("Subsector actualizado correctamente.");
      } else {
        await subsectoresService.create(session, payload);
        setSuccessMessage("Subsector creado correctamente.");
      }

      await loadData();
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
      await subsectoresService.remove(session, itemToDeactivate.id);
      setSuccessMessage("Subsector desactivado correctamente.");

      if (formState.id === itemToDeactivate.id) {
        setFormState(emptyForm);
      }

      setItemToDeactivate(null);
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

  return (
    <article className="panel">
      <ToolbarActions
        actions={
          <>
            <button
              className="ui-button ui-button--ghost"
              onClick={() => void loadData()}
              type="button"
            >
              Recargar
            </button>
            <Link
              className="ui-button ui-button--secondary"
              href={adminRoutes.mantenimientoItems.sectores}
            >
              Ver sectores
            </Link>
            <button
              className="ui-button ui-button--primary"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              type="button"
            >
              Nuevo subsector
            </button>
          </>
        }
        description="CRUD administrativo de subsectores dentro de cada sector."
        eyebrow="Mantenimiento"
        title="Subsectores"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSectorFilter("");
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
            placeholder="Subsector, descripcion o sector"
            value={search}
          />
        </label>

        <label className="field-group">
          <span>Sector</span>
          <select
            onChange={(event) => setSectorFilter(event.target.value)}
            value={sectorFilter}
          >
            <option value="">Todos</option>
            {sectores.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
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
        <LoadingState description="Cargando subsectores..." />
      ) : null}

      {!listError && !isLoading && sectores.length === 0 ? (
        <EmptyState
          description="Primero debes registrar sectores para poder crear subsectores."
          title="Sin sectores disponibles"
        />
      ) : null}

      {!listError &&
      !isLoading &&
      sectores.length > 0 &&
      filteredItems.length === 0 ? (
        <EmptyState
          description="No hay subsectores cargados o los filtros no devolvieron coincidencias."
          title="No se encontraron subsectores"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Listado administrativo de subsectores."
          columns={columns}
          getRowKey={(row) => row.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => {
          resetForm();
          setModalOpen(false);
        }}
        title={formState.id ? "Editar subsector" : "Nuevo subsector"}
        description="Crea o edita subsectores relacionados con un sector."
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
              form="subsectores-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear subsector"}
            </button>
          </>
        }
      >
        <form
          className="form-layout"
          id="subsectores-form"
          onSubmit={handleSubmit}
        >
          <label className="field-group">
            <span>Sector</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  sectorId: event.target.value
                }))
              }
              value={formState.sectorId}
            >
              <option value="">Selecciona un sector</option>
              {sectores.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Nombre</span>
            <input
              maxLength={120}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Norte"
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
              placeholder="Descripcion del subsector"
              value={formState.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as SubsectorFormState["status"]
                }))
              }
              value={formState.status}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
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
            ? `Se desactivara el subsector ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
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
