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
  CampaniaCatalogItem,
  CatalogOption
} from "../types/agricultural-catalogs.types";
import {
  buildOptionsLookup,
  formatDateLabel,
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type CampaniaFormState = {
  id: string | null;
  name: string;
  cultivoId: string;
  startDate: string;
  endDate: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: CampaniaFormState = {
  id: null,
  name: "",
  cultivoId: "",
  startDate: "",
  endDate: "",
  description: "",
  status: "active"
};

export function CampaniasManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<CampaniaCatalogItem[]>([]);
  const [cultivoOptions, setCultivoOptions] = useState<CatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cultivoFilter, setCultivoFilter] = useState("all");
  const [formState, setFormState] = useState<CampaniaFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<CampaniaCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const cultivoLookup = useMemo(
    () => buildOptionsLookup(cultivoOptions),
    [cultivoOptions]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const cultivoLabel = cultivoLookup[item.cultivoId] ?? item.cultivoId;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
        cultivoLabel.toLowerCase().includes(normalizedSearch);

      const matchesCultivo =
        cultivoFilter === "all" || item.cultivoId === cultivoFilter;

      return (
        matchesSearch &&
        matchesCultivo &&
        matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [items, search, cultivoLookup, cultivoFilter, statusFilter]);

  const columns: DataTableColumn<CampaniaCatalogItem>[] = [
    {
      key: "name",
      header: "Campania",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.name}</strong>
          <span>{cultivoLookup[item.cultivoId] ?? item.cultivoId}</span>
        </div>
      )
    },
    {
      key: "dates",
      header: "Fechas",
      cell: (item) => (
        <div className="table-copy">
          <strong>{formatDateLabel(item.startDate)}</strong>
          <span>Fin: {formatDateLabel(item.endDate)}</span>
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

    setIsLoading(true);
    setListError(null);

    try {
      const [nextItems, nextCultivos] = await Promise.all([
        agriculturalCatalogsService.getCampanias(session),
        agriculturalCatalogsService.getCultivoOptions(session)
      ]);

      setItems(nextItems);
      setCultivoOptions(nextCultivos);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: CampaniaCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      name: item.name,
      cultivoId: item.cultivoId,
      startDate: item.startDate,
      endDate: item.endDate ?? "",
      description: item.description ?? "",
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
    const cultivoId = formState.cultivoId.trim();
    const startDate = formState.startDate.trim();
    const endDate = formState.endDate.trim();
    const description = formState.description.trim();

    if (!name || !cultivoId || !startDate) {
      setFormError("Nombre, cultivo y fecha de inicio son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name,
        cultivoId,
        startDate,
        endDate: endDate || null,
        description: description || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await agriculturalCatalogsService.updateCampania(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Campania actualizada correctamente.");
      } else {
        await agriculturalCatalogsService.createCampania(session, payload);
        setSuccessMessage("Campania creada correctamente.");
      }

      await loadData();
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
      await agriculturalCatalogsService.deleteCampania(session, itemToDeactivate.id);
      setSuccessMessage("Campania desactivada correctamente.");

      if (formState.id === itemToDeactivate.id) {
        setFormState(emptyForm);
      }

      setItemToDeactivate(null);
      await loadData();
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
            <button className="ui-button ui-button--ghost" onClick={() => void loadData()} type="button">
              Recargar
            </button>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nueva campania
            </button>
          </>
        }
        description="Gestion administrativa de campanias agricolas."
        eyebrow="Mantenimiento"
        title="Campanias"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setCultivoFilter("all");
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
          <span>Cultivo</span>
          <select
            onChange={(event) => setCultivoFilter(event.target.value)}
            value={cultivoFilter}
          >
            <option value="all">Todos</option>
            {cultivoOptions.map((option) => (
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
              setStatusFilter(event.target.value as StatusFilter)
            }
            value={statusFilter}
          >
            <option value="all">Todos</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
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
        <LoadingState description="Cargando campanias..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay campanias registradas o los filtros no devolvieron coincidencias."
          title="No hay campanias para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Catalogo administrativo de campanias."
          columns={columns}
          getRowKey={(item) => item.id}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={formState.id ? "Editar campania" : "Nueva campania"}
        description="Alta o edicion simple de campanias con su cultivo y fechas."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="campanias-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear campania"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="campanias-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Nombre</span>
            <input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Campania 2026"
              value={formState.name}
            />
          </label>

          <label className="field-group">
            <span>Cultivo</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  cultivoId: event.target.value
                }))
              }
              value={formState.cultivoId}
            >
              <option value="">Selecciona un cultivo</option>
              {cultivoOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="field-grid">
            <label className="field-group">
              <span>Fecha de inicio</span>
              <input
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    startDate: event.target.value
                  }))
                }
                type="date"
                value={formState.startDate}
              />
            </label>

            <label className="field-group">
              <span>Fecha de fin</span>
              <input
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    endDate: event.target.value
                  }))
                }
                type="date"
                value={formState.endDate}
              />
            </label>
          </div>

          <label className="field-group">
            <span>Descripcion</span>
            <textarea
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  description: event.target.value
                }))
              }
              placeholder="Descripcion breve de la campania"
              value={formState.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as CampaniaFormState["status"]
                }))
              }
              value={formState.status}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
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
            ? `Se desactivara la campania ${itemToDeactivate.name}. Podra reactivarse mas adelante.`
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
        title="Desactivar campania"
        variant="warning"
      />
    </article>
  );
}
