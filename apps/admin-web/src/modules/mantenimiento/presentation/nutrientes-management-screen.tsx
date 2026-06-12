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
  CultivoCatalogItem,
  NutrientCatalogItem,
  NutrientDetailCatalogItem
} from "../types/agricultural-catalogs.types";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "./catalog-screen.helpers";

type NutrientFormState = {
  id: string | null;
  cultivoId: string;
  name: string;
  description: string;
  status: "active" | "inactive";
};

type DetailFormState = {
  id: string | null;
  nutrientId: string;
  name: string;
  description: string;
  status: "active" | "inactive";
};

type PendingDeactivate =
  | { type: "nutrient"; item: NutrientCatalogItem }
  | { type: "detail"; item: NutrientDetailCatalogItem };

const emptyNutrientForm: NutrientFormState = {
  id: null,
  cultivoId: "",
  name: "",
  description: "",
  status: "active"
};

const emptyDetailForm: DetailFormState = {
  id: null,
  nutrientId: "",
  name: "",
  description: "",
  status: "active"
};

export function NutrientesManagementScreen() {
  const { session } = useAuthSession();
  const [nutrients, setNutrients] = useState<NutrientCatalogItem[]>([]);
  const [details, setDetails] = useState<NutrientDetailCatalogItem[]>([]);
  const [cultivos, setCultivos] = useState<CultivoCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cultivoFilter, setCultivoFilter] = useState("all");
  const [nutrientForm, setNutrientForm] = useState<NutrientFormState>(emptyNutrientForm);
  const [detailForm, setDetailForm] = useState<DetailFormState>(emptyDetailForm);
  const [nutrientModalOpen, setNutrientModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState<PendingDeactivate | null>(
    null
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadItems();
  }, [session]);

  const cultivoLookup = useMemo(
    () =>
      Object.fromEntries(
        cultivos.map((cultivo) => [
          cultivo.id,
          cultivo.code ? `${cultivo.code} - ${cultivo.name}` : cultivo.name
        ])
      ),
    [cultivos]
  );

  const nutrientLookup = useMemo(
    () =>
      Object.fromEntries(
        nutrients.map((nutrient) => [
          nutrient.id,
          `${nutrient.name} (${getLookupLabel(cultivoLookup, nutrient.cultivoId)})`
        ])
      ),
    [nutrients, cultivoLookup]
  );

  const filteredNutrients = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return nutrients.filter((nutrient) => {
      const cropLabel = getLookupLabel(cultivoLookup, nutrient.cultivoId);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        nutrient.name.toLowerCase().includes(normalizedSearch) ||
        cropLabel.toLowerCase().includes(normalizedSearch) ||
        (nutrient.description ?? "").toLowerCase().includes(normalizedSearch);

      const matchesCrop = cultivoFilter === "all" || nutrient.cultivoId === cultivoFilter;

      return (
        matchesSearch &&
        matchesCrop &&
        matchesStatusFilter(nutrient.isActive, statusFilter)
      );
    });
  }, [nutrients, search, cultivoFilter, statusFilter, cultivoLookup]);

  const filteredDetails = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return details.filter((detail) => {
      const nutrient = nutrients.find((item) => item.id === detail.nutrientId);
      const cropId = nutrient?.cultivoId ?? "";
      const nutrientLabel = getLookupLabel(nutrientLookup, detail.nutrientId);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        detail.name.toLowerCase().includes(normalizedSearch) ||
        nutrientLabel.toLowerCase().includes(normalizedSearch) ||
        (detail.description ?? "").toLowerCase().includes(normalizedSearch);

      const matchesCrop = cultivoFilter === "all" || cropId === cultivoFilter;

      return (
        matchesSearch && matchesCrop && matchesStatusFilter(detail.isActive, statusFilter)
      );
    });
  }, [details, nutrients, search, cultivoFilter, statusFilter, nutrientLookup]);

  const nutrientColumns: DataTableColumn<NutrientCatalogItem>[] = [
    {
      key: "name",
      header: "Nutriente",
      cell: (item) => item.name
    },
    {
      key: "cultivo",
      header: "Cultivo",
      cell: (item) => getLookupLabel(cultivoLookup, item.cultivoId)
    },
    {
      key: "description",
      header: "Descripcion",
      cell: (item) => item.description ?? "Sin descripcion"
    },
    {
      key: "details",
      header: "Detalles",
      cell: (item) => details.filter((detail) => detail.nutrientId === item.id).length
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
            onClick={() => handleEditNutrient(item)}
            type="button"
          >
            Editar
          </button>
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => handleNewDetail(item.id)}
            type="button"
          >
            Detalle
          </button>
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => setPendingDeactivate({ type: "nutrient", item })}
            type="button"
          >
            Desactivar
          </button>
        </div>
      )
    }
  ];

  const detailColumns: DataTableColumn<NutrientDetailCatalogItem>[] = [
    {
      key: "nutrient",
      header: "Nutriente",
      cell: (item) => getLookupLabel(nutrientLookup, item.nutrientId)
    },
    {
      key: "name",
      header: "Detalle",
      cell: (item) => item.name
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
            onClick={() => handleEditDetail(item)}
            type="button"
          >
            Editar
          </button>
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => setPendingDeactivate({ type: "detail", item })}
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
      const [nextNutrients, nextDetails, nextCultivos] = await Promise.all([
        agriculturalCatalogsService.getNutrients(session),
        agriculturalCatalogsService.getNutrientDetails(session),
        agriculturalCatalogsService.getCultivos(session)
      ]);

      setNutrients(nextNutrients);
      setDetails(nextDetails);
      setCultivos(nextCultivos);
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEditNutrient(item: NutrientCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setNutrientForm({
      id: item.id,
      cultivoId: item.cultivoId,
      name: item.name,
      description: item.description ?? "",
      status: item.isActive ? "active" : "inactive"
    });
    setNutrientModalOpen(true);
  }

  function handleEditDetail(item: NutrientDetailCatalogItem) {
    setFormError(null);
    setSuccessMessage(null);
    setDetailForm({
      id: item.id,
      nutrientId: item.nutrientId,
      name: item.name,
      description: item.description ?? "",
      status: item.isActive ? "active" : "inactive"
    });
    setDetailModalOpen(true);
  }

  function handleNewDetail(nutrientId = "") {
    setFormError(null);
    setSuccessMessage(null);
    setDetailForm({
      ...emptyDetailForm,
      nutrientId
    });
    setDetailModalOpen(true);
  }

  function resetNutrientForm() {
    setFormError(null);
    setSuccessMessage(null);
    setNutrientForm(emptyNutrientForm);
  }

  function resetDetailForm() {
    setFormError(null);
    setSuccessMessage(null);
    setDetailForm(emptyDetailForm);
  }

  async function handleNutrientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (!nutrientForm.cultivoId || !nutrientForm.name.trim()) {
      setFormError("Cultivo y nombre del nutriente son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        cultivoId: nutrientForm.cultivoId,
        name: nutrientForm.name.trim(),
        description: nutrientForm.description.trim() || null,
        isActive: nutrientForm.status === "active"
      };

      if (nutrientForm.id) {
        await agriculturalCatalogsService.updateNutrient(
          session,
          nutrientForm.id,
          payload
        );
        setSuccessMessage("Nutriente actualizado correctamente.");
      } else {
        await agriculturalCatalogsService.createNutrient(session, payload);
        setSuccessMessage("Nutriente creado correctamente.");
      }

      await loadItems();
      setNutrientForm(emptyNutrientForm);
      setNutrientModalOpen(false);
    } catch (error) {
      setFormError(toApiError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDetailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (!detailForm.nutrientId || !detailForm.name.trim()) {
      setFormError("Nutriente y nombre del detalle son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        nutrientId: detailForm.nutrientId,
        name: detailForm.name.trim(),
        description: detailForm.description.trim() || null,
        isActive: detailForm.status === "active"
      };

      if (detailForm.id) {
        await agriculturalCatalogsService.updateNutrientDetail(
          session,
          detailForm.id,
          payload
        );
        setSuccessMessage("Detalle actualizado correctamente.");
      } else {
        await agriculturalCatalogsService.createNutrientDetail(session, payload);
        setSuccessMessage("Detalle creado correctamente.");
      }

      await loadItems();
      setDetailForm(emptyDetailForm);
      setDetailModalOpen(false);
    } catch (error) {
      setFormError(toApiError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateConfirm() {
    if (!session || !pendingDeactivate) {
      return;
    }

    setIsDeleting(true);

    try {
      if (pendingDeactivate.type === "nutrient") {
        await agriculturalCatalogsService.deleteNutrient(
          session,
          pendingDeactivate.item.id
        );
        setSuccessMessage("Nutriente desactivado correctamente.");
      } else {
        await agriculturalCatalogsService.deleteNutrientDetail(
          session,
          pendingDeactivate.item.id
        );
        setSuccessMessage("Detalle desactivado correctamente.");
      }

      setPendingDeactivate(null);
      await loadItems();
    } catch (error) {
      setListError(toApiError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  const deactivateTitle =
    pendingDeactivate?.type === "nutrient"
      ? "Desactivar nutriente"
      : "Desactivar detalle";

  const deactivateDescription =
    pendingDeactivate?.type === "nutrient"
      ? `Se desactivara ${pendingDeactivate.item.name}. Sus detalles no se eliminaran.`
      : pendingDeactivate
        ? `Se desactivara ${pendingDeactivate.item.name}. Podra reactivarse editandolo.`
        : "";

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
              className="ui-button ui-button--secondary"
              onClick={() => handleNewDetail()}
              type="button"
            >
              Nuevo detalle
            </button>
            <button
              className="ui-button ui-button--primary"
              onClick={() => {
                resetNutrientForm();
                setNutrientModalOpen(true);
              }}
              type="button"
            >
              Nuevo nutriente
            </button>
          </>
        }
        description="Administra nutrientes por cultivo y los detalles de severidad que luego usara el paso 3 de visitas."
        eyebrow="Mantenimiento"
        title="Nutrientes"
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
            placeholder="Nutriente, cultivo, detalle o descripcion"
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
            {cultivos.map((cultivo) => (
              <option key={cultivo.id} value={cultivo.id}>
                {getLookupLabel(cultivoLookup, cultivo.id)}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group">
          <span>Estado</span>
          <select
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
      </FilterBar>

      {successMessage ? <FeedbackBanner kind="success" message={successMessage} /> : null}

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
        <LoadingState description="Cargando nutrientes..." />
      ) : null}

      {!listError && !isLoading ? (
        <>
          <section className="form-layout">
            <h2>Nutrientes por cultivo</h2>
            {filteredNutrients.length === 0 ? (
              <EmptyState
                description="No hay nutrientes cargados o los filtros no devolvieron coincidencias."
                title="No hay nutrientes para mostrar"
              />
            ) : (
              <DataTable
                caption="Catalogo administrativo de nutrientes."
                columns={nutrientColumns}
                getRowKey={(item) => item.id}
                rows={filteredNutrients}
              />
            )}
          </section>

          <section className="form-layout">
            <h2>Detalle de nutrientes</h2>
            {filteredDetails.length === 0 ? (
              <EmptyState
                description="No hay detalles cargados o los filtros no devolvieron coincidencias."
                title="No hay detalles para mostrar"
              />
            ) : (
              <DataTable
                caption="Detalles administrativos de severidad nutricional."
                columns={detailColumns}
                getRowKey={(item) => item.id}
                rows={filteredDetails}
              />
            )}
          </section>
        </>
      ) : null}

      <FormModal
        open={nutrientModalOpen}
        onClose={() => {
          resetNutrientForm();
          setNutrientModalOpen(false);
        }}
        title={nutrientForm.id ? "Editar nutriente" : "Nuevo nutriente"}
        description="Alta o edicion del catalogo de nutrientes por cultivo."
        footer={
          <>
            <button
              className="ui-button ui-button--ghost"
              onClick={() => {
                resetNutrientForm();
                setNutrientModalOpen(false);
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="nutrient-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : nutrientForm.id
                  ? "Guardar cambios"
                  : "Crear nutriente"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="nutrient-form" onSubmit={handleNutrientSubmit}>
          <label className="field-group">
            <span>Cultivo</span>
            <select
              onChange={(event) =>
                setNutrientForm((currentState) => ({
                  ...currentState,
                  cultivoId: event.target.value
                }))
              }
              value={nutrientForm.cultivoId}
            >
              <option value="">Seleccionar</option>
              {cultivos.map((cultivo) => (
                <option key={cultivo.id} value={cultivo.id}>
                  {getLookupLabel(cultivoLookup, cultivo.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Nombre</span>
            <input
              onChange={(event) =>
                setNutrientForm((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Ej. Zinc"
              value={nutrientForm.name}
            />
          </label>

          <label className="field-group">
            <span>Descripcion</span>
            <textarea
              onChange={(event) =>
                setNutrientForm((currentState) => ({
                  ...currentState,
                  description: event.target.value
                }))
              }
              placeholder="Descripcion general del nutriente"
              value={nutrientForm.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setNutrientForm((currentState) => ({
                  ...currentState,
                  status: event.target.value as NutrientFormState["status"]
                }))
              }
              value={nutrientForm.status}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
        </form>
        {formError ? <p className="form-error">{formError}</p> : null}
      </FormModal>

      <FormModal
        open={detailModalOpen}
        onClose={() => {
          resetDetailForm();
          setDetailModalOpen(false);
        }}
        title={detailForm.id ? "Editar detalle" : "Nuevo detalle"}
        description="Alta o edicion de detalles del nutriente, por ejemplo Grado 1, Grado 2 o una clasificacion equivalente."
        footer={
          <>
            <button
              className="ui-button ui-button--ghost"
              onClick={() => {
                resetDetailForm();
                setDetailModalOpen(false);
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving}
              form="nutrient-detail-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : detailForm.id
                  ? "Guardar cambios"
                  : "Crear detalle"}
            </button>
          </>
        }
      >
        <form
          className="form-layout"
          id="nutrient-detail-form"
          onSubmit={handleDetailSubmit}
        >
          <label className="field-group">
            <span>Nutriente</span>
            <select
              onChange={(event) =>
                setDetailForm((currentState) => ({
                  ...currentState,
                  nutrientId: event.target.value
                }))
              }
              value={detailForm.nutrientId}
            >
              <option value="">Seleccionar</option>
              {nutrients.map((nutrient) => (
                <option key={nutrient.id} value={nutrient.id}>
                  {getLookupLabel(nutrientLookup, nutrient.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Nombre</span>
            <input
              onChange={(event) =>
                setDetailForm((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Ej. Grado 1"
              value={detailForm.name}
            />
          </label>

          <label className="field-group">
            <span>Descripcion</span>
            <textarea
              onChange={(event) =>
                setDetailForm((currentState) => ({
                  ...currentState,
                  description: event.target.value
                }))
              }
              placeholder="Descripcion del detalle o severidad"
              value={detailForm.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setDetailForm((currentState) => ({
                  ...currentState,
                  status: event.target.value as DetailFormState["status"]
                }))
              }
              value={detailForm.status}
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
        description={deactivateDescription}
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setPendingDeactivate(null);
          }
        }}
        onConfirm={() => void handleDeactivateConfirm()}
        open={pendingDeactivate !== null}
        title={deactivateTitle}
        variant="warning"
      />
    </article>
  );
}

function getLookupLabel(lookup: Record<string, string>, id: string) {
  return lookup[id] ?? `ID ${id}`;
}
