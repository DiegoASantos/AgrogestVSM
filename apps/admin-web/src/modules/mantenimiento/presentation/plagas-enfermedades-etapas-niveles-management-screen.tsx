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
  EtapaFenologicaCatalogItem,
  NivelIncidenciaCatalogItem,
  PlagaEnfermedadCatalogItem,
  PlagaEnfermedadEtapaNivelCatalogItem
} from "../types/agricultural-catalogs.types";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type RelationFormState = {
  id: string | null;
  plagaEnfermedadId: string;
  etapaFenologicaId: string;
  nivelIncidenciaSeveridadId: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: RelationFormState = {
  id: null,
  plagaEnfermedadId: "",
  etapaFenologicaId: "",
  nivelIncidenciaSeveridadId: "",
  description: "",
  status: "active"
};

export function PlagasEnfermedadesEtapasNivelesManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<PlagaEnfermedadEtapaNivelCatalogItem[]>([]);
  const [plagas, setPlagas] = useState<PlagaEnfermedadCatalogItem[]>([]);
  const [etapas, setEtapas] = useState<EtapaFenologicaCatalogItem[]>([]);
  const [niveles, setNiveles] = useState<NivelIncidenciaCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formState, setFormState] = useState<RelationFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<PlagaEnfermedadEtapaNivelCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadItems();
  }, [session]);

  const plagaLookup = useMemo(
    () => Object.fromEntries(plagas.map((plaga) => [plaga.id, plaga.name])),
    [plagas]
  );

  const etapaLookup = useMemo(
    () =>
      Object.fromEntries(
        etapas.map((etapa) => [
          etapa.id,
          etapa.sortOrder === null
            ? etapa.name
            : `${etapa.sortOrder} - ${etapa.name}`
        ])
      ),
    [etapas]
  );

  const nivelLookup = useMemo(
    () =>
      Object.fromEntries(
        niveles.map((nivel) => [
          nivel.id,
          `${formatNivelType(nivel.type)} - ${nivel.name}`
        ])
      ),
    [niveles]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const plagaLabel = getLookupLabel(plagaLookup, item.plagaEnfermedadId);
      const etapaLabel = getLookupLabel(etapaLookup, item.etapaFenologicaId);
      const nivelLabel = getLookupLabel(
        nivelLookup,
        item.nivelIncidenciaSeveridadId
      );

      const matchesSearch =
        normalizedSearch.length === 0 ||
        plagaLabel.toLowerCase().includes(normalizedSearch) ||
        etapaLabel.toLowerCase().includes(normalizedSearch) ||
        nivelLabel.toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch);

      return (
        matchesSearch && matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [items, search, statusFilter, plagaLookup, etapaLookup, nivelLookup]);

  const columns: DataTableColumn<PlagaEnfermedadEtapaNivelCatalogItem>[] = [
    {
      key: "plagaEnfermedad",
      header: "Plaga o enfermedad",
      cell: (item) => getLookupLabel(plagaLookup, item.plagaEnfermedadId)
    },
    {
      key: "etapaFenologica",
      header: "Etapa fenologica",
      cell: (item) => getLookupLabel(etapaLookup, item.etapaFenologicaId)
    },
    {
      key: "nivel",
      header: "Nivel",
      cell: (item) =>
        getLookupLabel(nivelLookup, item.nivelIncidenciaSeveridadId)
    },
    {
      key: "description",
      header: "Descripcion",
      cell: (item) => item.description ?? "Sin descripcion"
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
      const [nextItems, nextPlagas, nextEtapas, nextNiveles] =
        await Promise.all([
          agriculturalCatalogsService.getPlagasEnfermedadesEtapasNiveles(
            session
          ),
          agriculturalCatalogsService.getPlagasEnfermedades(session),
          agriculturalCatalogsService.getEtapasFenologicas(session),
          agriculturalCatalogsService.getNivelesIncidencia(session)
        ]);

      setItems(nextItems);
      setPlagas(nextPlagas);
      setEtapas(nextEtapas);
      setNiveles(nextNiveles);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: PlagaEnfermedadEtapaNivelCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      plagaEnfermedadId: item.plagaEnfermedadId,
      etapaFenologicaId: item.etapaFenologicaId,
      nivelIncidenciaSeveridadId: item.nivelIncidenciaSeveridadId,
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

    if (
      !formState.plagaEnfermedadId ||
      !formState.etapaFenologicaId ||
      !formState.nivelIncidenciaSeveridadId
    ) {
      setFormError("Plaga/enfermedad, etapa y nivel son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        plagaEnfermedadId: formState.plagaEnfermedadId,
        etapaFenologicaId: formState.etapaFenologicaId,
        nivelIncidenciaSeveridadId: formState.nivelIncidenciaSeveridadId,
        description: formState.description.trim() || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await agriculturalCatalogsService.updatePlagaEnfermedadEtapaNivel(
          session,
          formState.id,
          payload
        );
        setSuccessMessage("Relacion actualizada correctamente.");
      } else {
        await agriculturalCatalogsService.createPlagaEnfermedadEtapaNivel(
          session,
          payload
        );
        setSuccessMessage("Relacion creada correctamente.");
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
      await agriculturalCatalogsService.deletePlagaEnfermedadEtapaNivel(
        session,
        itemToDeactivate.id
      );
      setSuccessMessage("Relacion desactivada correctamente.");

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
            <button
              className="ui-button ui-button--ghost"
              onClick={() => void loadItems()}
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
              Nueva relacion
            </button>
          </>
        }
        description="Relaciona plagas y enfermedades con etapas fenologicas y niveles de incidencia o severidad."
        eyebrow="Mantenimiento"
        title="Plagas, etapas y niveles"
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
            placeholder="Plaga, etapa, nivel o descripcion"
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
        <LoadingState description="Cargando relaciones..." />
      ) : null}

      {!listError && !isLoading && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay relaciones cargadas o los filtros no devolvieron coincidencias."
          title="No hay relaciones para mostrar"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Relaciones administrativas de plagas, etapas y niveles."
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
        title={formState.id ? "Editar relacion" : "Nueva relacion"}
        description="Alta o edicion de una relacion sanitaria por etapa y nivel."
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
              form="plagas-etapas-niveles-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear relacion"}
            </button>
          </>
        }
      >
        <form
          className="form-layout"
          id="plagas-etapas-niveles-form"
          onSubmit={handleSubmit}
        >
          <label className="field-group">
            <span>Plaga o enfermedad</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  plagaEnfermedadId: event.target.value
                }))
              }
              value={formState.plagaEnfermedadId}
            >
              <option value="">Seleccionar</option>
              {plagas.map((plaga) => (
                <option key={plaga.id} value={plaga.id}>
                  {plaga.name}
                </option>
              ))}
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
              <option value="">Seleccionar</option>
              {etapas.map((etapa) => (
                <option key={etapa.id} value={etapa.id}>
                  {etapa.sortOrder === null
                    ? etapa.name
                    : `${etapa.sortOrder} - ${etapa.name}`}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Nivel incidencia/severidad</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  nivelIncidenciaSeveridadId: event.target.value
                }))
              }
              value={formState.nivelIncidenciaSeveridadId}
            >
              <option value="">Seleccionar</option>
              {niveles.map((nivel) => (
                <option key={nivel.id} value={nivel.id}>
                  {formatNivelType(nivel.type)} - {nivel.name}
                </option>
              ))}
            </select>
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
              placeholder="Detalle de la relacion"
              value={formState.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as RelationFormState["status"]
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
            ? `Se desactivara la relacion de ${getLookupLabel(
                plagaLookup,
                itemToDeactivate.plagaEnfermedadId
              )}. Podra reactivarse mas adelante.`
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
        title="Desactivar relacion"
        variant="warning"
      />
    </article>
  );
}

function getLookupLabel(lookup: Record<string, string>, id: string) {
  return lookup[id] ?? `ID ${id}`;
}

function formatNivelType(type: NivelIncidenciaCatalogItem["type"]) {
  return type === "incidencia" ? "Incidencia" : "Severidad";
}
