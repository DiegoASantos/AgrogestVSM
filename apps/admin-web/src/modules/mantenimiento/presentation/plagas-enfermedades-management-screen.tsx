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
import type {
  CatalogOption,
  PlagaEnfermedadCatalogItem,
  PlagaEnfermedadCatalogType
} from "../types/agricultural-catalogs.types";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type PlagaFormState = {
  id: string | null;
  scientificName: string;
  name: string;
  type: PlagaEnfermedadCatalogType;
  etapaFenologicaId: string;
  status: "active" | "inactive";
};

const emptyForm: PlagaFormState = {
  id: null,
  scientificName: "",
  name: "",
  type: "plaga",
  etapaFenologicaId: "",
  status: "active"
};

export function PlagasEnfermedadesManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<PlagaEnfermedadCatalogItem[]>([]);
  const [etapaOptions, setEtapaOptions] = useState<CatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PlagaEnfermedadCatalogType>(
    "all"
  );
  const [formState, setFormState] = useState<PlagaFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<PlagaEnfermedadCatalogItem | null>(null);
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
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.scientificName ?? "").toLowerCase().includes(normalizedSearch) ||
        item.type.toLowerCase().includes(normalizedSearch) ||
        getEtapaLabel(item.etapaFenologicaId, etapaOptions)
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesType = typeFilter === "all" || item.type === typeFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [items, search, typeFilter, statusFilter, etapaOptions]);

  const columns: DataTableColumn<PlagaEnfermedadCatalogItem>[] = [
    {
      key: "name",
      header: "Nombre",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
        </div>
      )
    },
    {
      key: "scientificName",
      header: "Nombre cientifico",
      cell: (item) => item.scientificName ?? "Sin nombre cientifico"
    },
    {
      key: "type",
      header: "Tipo",
      cell: (item) => item.type
    },
    {
      key: "etapaFenologica",
      header: "Etapa fenologica",
      cell: (item) => getEtapaLabel(item.etapaFenologicaId, etapaOptions)
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

  async function loadItems() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setListError(null);

    try {
      const [nextItems, nextEtapaOptions] = await Promise.all([
        agriculturalCatalogsService.getPlagasEnfermedades(session),
        agriculturalCatalogsService.getEtapaFenologicaOptions(session)
      ]);
      setItems(nextItems);
      setEtapaOptions(nextEtapaOptions);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: PlagaEnfermedadCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      scientificName: item.scientificName ?? "",
      name: item.name,
      type: item.type,
      etapaFenologicaId: item.etapaFenologicaId ?? "",
      status: item.isActive ? "active" : "inactive"
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
    const scientificName = formState.scientificName.trim();

    if (!name) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        scientificName: scientificName || null,
        name,
        type: formState.type,
        etapaFenologicaId: formState.etapaFenologicaId || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await agriculturalCatalogsService.updatePlagaEnfermedad(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Registro actualizado correctamente.");
      } else {
        await agriculturalCatalogsService.createPlagaEnfermedad(session, payload);
        setSuccessMessage("Registro creado correctamente.");
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

  async function handleDeactivateConfirm() {
    if (!session || !itemToDeactivate) {
      return;
    }

    setIsDeleting(true);

    try {
      await agriculturalCatalogsService.deletePlagaEnfermedad(
        session,
        itemToDeactivate.id
      );
      setSuccessMessage("Registro desactivado correctamente.");

      if (formState.id === itemToDeactivate.id) {
        setFormState(emptyForm);
      }

      setItemToDeactivate(null);
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
              Nuevo registro
            </button>
          </>
        }
        description="Gestion administrativa del catalogo de plagas y enfermedades."
        eyebrow="Mantenimiento"
        title="Plagas y enfermedades"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setTypeFilter("all");
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
            placeholder="Nombre, cientifico, tipo o etapa"
            value={search}
          />
        </label>

        <label className="field-group">
          <span>Tipo</span>
          <select
            onChange={(event) =>
              setTypeFilter(
                event.target.value as "all" | PlagaEnfermedadCatalogType
              )
            }
            value={typeFilter}
          >
            <option value="all">Todos</option>
            <option value="plaga">Plaga</option>
            <option value="enfermedad">Enfermedad</option>
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
        <LoadingState description="Cargando catalogo..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay registros cargados o los filtros no devolvieron coincidencias."
          title="No hay registros para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de plagas y enfermedades."
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar registro" : "Nuevo registro"}
        description="Alta o edicion simple de plagas y enfermedades."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="plagas-form"
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
        <form className="form-layout" id="plagas-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Nombre cientifico</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  scientificName: event.target.value
                }))
              }
              placeholder="Pyricularia oryzae"
              value={formState.scientificName}
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
              placeholder="Nombre visible"
              value={formState.name}
            />
          </label>

          <label className="field-group">
            <span>Tipo</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  type: event.target.value as PlagaEnfermedadCatalogType
                }))
              }
              value={formState.type}
            >
              <option value="plaga">Plaga</option>
              <option value="enfermedad">Enfermedad</option>
            </select>
          </label>

          <label className="field-group">
            <span>Etapa fenologica</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  etapaFenologicaId: event.target.value
                }))
              }
              value={formState.etapaFenologicaId}
            >
              <option value="">Sin etapa asociada</option>
              {etapaOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as PlagaFormState["status"]
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
            ? `Se desactivara el registro ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
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
        title="Desactivar registro"
        variant="warning"
      />
    </article>
  );
}

function getEtapaLabel(etapaFenologicaId: string | null, options: CatalogOption[]) {
  if (!etapaFenologicaId) {
    return "Sin etapa asociada";
  }

  return (
    options.find((option) => option.id === etapaFenologicaId)?.label ??
    `ID ${etapaFenologicaId}`
  );
}
