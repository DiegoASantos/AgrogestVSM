"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { geografiasService } from "../../geografias/services/geografias.service";
import type { DistritoListItem } from "../../geografias/types/geografias.types";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "../../mantenimiento/presentation/catalog-screen.helpers";
import { sectoresService } from "../../sectores/services/sectores.service";
import type { SectorListItem } from "../../sectores/types/sectores.types";
import { productoresService } from "../services/productores.service";
import type { ProductorListItem } from "../types/productores.types";
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

type ProductorSectoresManagementScreenProps = {
  productorId: string;
};

type SectorFormState = {
  id: string | null;
  distritoId: string;
  name: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: SectorFormState = {
  id: null,
  distritoId: "",
  name: "",
  description: "",
  status: "active"
};

export function ProductorSectoresManagementScreen({
  productorId
}: ProductorSectoresManagementScreenProps) {
  const { session, logout } = useAuthSession();
  const [productor, setProductor] = useState<ProductorListItem | null>(null);
  const [items, setItems] = useState<SectorListItem[]>([]);
  const [distritos, setDistritos] = useState<DistritoListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
  }, [productorId, session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch);

      return matchesSearch && matchesStatusFilter(item.isActive, statusFilter);
    });
  }, [items, search, statusFilter]);

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
      const [nextProductor, nextSectors, nextDistritos] = await Promise.all([
        productoresService.getById(session, productorId),
        sectoresService.getByProductor(session, productorId),
        geografiasService.getDistritos(session)
      ]);

      setProductor(nextProductor);
      setItems(nextSectors);
      setDistritos(nextDistritos);
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
      distritoId: item.distritoId,
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

    const name = formState.name.trim();
    const description = formState.description.trim();

    if (!name) {
      setFormError("El nombre del sector es obligatorio.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        distritoId: formState.distritoId,
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

  if (isLoading) {
    return <LoadingState description="Cargando productor y sus sectores..." />;
  }

  if (listError) {
    return (
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
    );
  }

  if (!productor) {
    return null;
  }

  return (
    <section className="panel-grid">
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
                Ver todos los sectores
              </Link>
              <Link
                className="ui-button ui-button--secondary"
                href={`/visitas/productores/${productor.id}`}
              >
                Historial del productor
              </Link>
              <Link
                className="ui-button ui-button--ghost"
                href={adminRoutes.mantenimientoItems.productores}
              >
                Volver a productores
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
          description="Consulta los sectores donde este productor tiene parcelas."
          eyebrow="Mantenimiento"
          title={`Sectores de ${productor.documentNumber}`}
        />

        <div className="stat-grid">
          <article className="stat-card">
            <p className="stat-card__label">Tipo documento</p>
            <p className="stat-card__value stat-card__value--small">
              {productor.documentTypeId}
            </p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Numero</p>
            <p className="stat-card__value stat-card__value--small">
              {productor.documentNumber}
            </p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Correo</p>
            <p className="stat-card__value stat-card__value--small">
              {productor.email || "No registrado"}
            </p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Sectores</p>
            <p className="stat-card__value">{items.length}</p>
          </article>
        </div>
      </article>

      <article className="panel">
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
              placeholder="Nombre o descripcion"
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

        {filteredItems.length === 0 ? (
          <EmptyState
            description="Este productor no tiene sectores cargados o los filtros no devolvieron coincidencias."
            title="Sin sectores"
          />
        ) : (
          <DataTable
            caption="Sectores del productor."
            columns={columns}
            getRowKey={(row) => row.id}
            rows={filteredItems}
          />
        )}

        <FormModal
          open={modalOpen}
          onClose={() => { resetForm(); setModalOpen(false); }}
          title={formState.id ? "Editar sector" : "Nuevo sector"}
          description="Crea o edita un sector territorial asociado a un distrito."
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
                form="productor-sectores-form"
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
          <form
            className="form-layout"
            id="productor-sectores-form"
            onSubmit={handleSubmit}
          >
            <label className="field-group">
              <span>Distrito</span>
              <select
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    distritoId: event.target.value
                  }))
                }
                value={formState.distritoId}
              >
                <option value="">Selecciona un distrito</option>
                {distritos.map((distrito) => (
                  <option key={distrito.id} value={distrito.id}>
                    {distrito.name} - {distrito.provincia.name}
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
      </article>

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
    </section>
  );
}
