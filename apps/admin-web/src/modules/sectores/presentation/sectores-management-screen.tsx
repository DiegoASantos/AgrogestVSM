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
import { productoresService } from "../../productores/services/productores.service";
import type { ProductorListItem } from "../../productores/types/productores.types";
import { sectoresService } from "../services/sectores.service";
import type { SectorListItem } from "../types/sectores.types";
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

type SectorFormState = {
  id: string | null;
  productorId: string;
  name: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: SectorFormState = {
  id: null,
  productorId: "",
  name: "",
  description: "",
  status: "active"
};

export function SectoresManagementScreen() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<SectorListItem[]>([]);
  const [productores, setProductores] = useState<ProductorListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [productorFilter, setProductorFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<SectorFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] = useState<SectorListItem | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const productoresLookup = useMemo(
    () =>
      productores.reduce<Record<string, string>>((accumulator, productor) => {
        accumulator[productor.id] = buildProductorLabel(productor);
        return accumulator;
      }, {}),
    [productores]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const productorLabel = productoresLookup[item.productorId] ?? item.productorId;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
        productorLabel.toLowerCase().includes(normalizedSearch);

      const matchesProductor =
        productorFilter.length === 0 || item.productorId === productorFilter;

      return (
        matchesSearch &&
        matchesProductor &&
        matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [items, productoresLookup, productorFilter, search, statusFilter]);

  const columns: DataTableColumn<SectorListItem>[] = [
    {
      key: "sector",
      header: "Sector",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{item.description || "Sin descripcion"}</span>
        </div>
      )
    },
    {
      key: "productor",
      header: "Productor",
      cell: (item) => (
        <div className="table-copy">
          <strong>{productoresLookup[item.productorId] ?? `ID ${item.productorId}`}</strong>
          <span>{item.productorId}</span>
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
            href={`/mantenimiento/productores/${item.productorId}`}
          >
            Productor
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

  async function loadData() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setListError(null);
      const [nextItems, nextProductores] = await Promise.all([
        sectoresService.getAll(session),
        productoresService.getAll(session)
      ]);
      setItems(nextItems);
      setProductores(nextProductores);
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

  function handleEdit(item: SectorListItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      productorId: item.productorId,
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

    const productorId = formState.productorId.trim();
    const name = formState.name.trim();
    const description = formState.description.trim();

    if (!productorId || !name) {
      setFormError("Productor y nombre del sector son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        productorId,
        name,
        description: description || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await sectoresService.update(session, formState.id, payload);
        setSuccessMessage("Sector actualizado correctamente.");
      } else {
        await sectoresService.create(session, payload);
        setSuccessMessage("Sector creado correctamente.");
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
      await sectoresService.remove(session, itemToDeactivate.id);
      setSuccessMessage("Sector desactivado correctamente.");

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
              href={adminRoutes.mantenimientoItems.productores}
            >
              Ver productores
            </Link>
            <button
              className="ui-button ui-button--primary"
              onClick={() => { resetForm(); setModalOpen(true); }}
              type="button"
            >
              Nuevo sector
            </button>
          </>
        }
        description="CRUD administrativo de sectores con acceso directo al productor relacionado."
        eyebrow="Mantenimiento"
        title="Sectores"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setProductorFilter("");
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
            placeholder="Sector, descripcion o productor"
            value={search}
          />
        </label>

        <label className="field-group">
          <span>Productor</span>
          <select
            onChange={(event) => setProductorFilter(event.target.value)}
            value={productorFilter}
          >
            <option value="">Todos</option>
            {productores.map((productor) => (
              <option key={productor.id} value={productor.id}>
                {buildProductorLabel(productor)}
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
        <LoadingState description="Cargando sectores..." />
      ) : null}

      {!listError && !isLoading && productores.length === 0 ? (
        <EmptyState
          description="Primero debes registrar al menos un productor para poder crear sectores."
          title="Sin productores disponibles"
        />
      ) : null}

      {!listError &&
      !isLoading &&
      productores.length > 0 &&
      filteredItems.length === 0 ? (
        <EmptyState
          description="No hay sectores cargados o los filtros no devolvieron coincidencias."
          title="No se encontraron sectores"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Listado administrativo de sectores."
          columns={columns}
          getRowKey={(row) => row.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar sector" : "Nuevo sector"}
        description="Crea o edita sectores relacionandolos con un productor."
        footer={
          <>
            <button
              className="ui-button ui-button--ghost"
              onClick={() => { resetForm(); setModalOpen(false); }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="sectores-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear sector"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="sectores-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Productor</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  productorId: event.target.value
                }))
              }
              value={formState.productorId}
            >
              <option value="">Selecciona un productor</option>
              {productores.map((productor) => (
                <option key={productor.id} value={productor.id}>
                  {buildProductorLabel(productor)}
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
              placeholder="Sector Norte"
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
              placeholder="Descripcion del sector"
              value={formState.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as SectorFormState["status"]
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
            ? `Se desactivara el sector ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
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

function buildProductorLabel(productor: ProductorListItem) {
  const suffix = productor.email ? ` - ${productor.email}` : "";
  return `${productor.documentNumber}${suffix}`;
}
