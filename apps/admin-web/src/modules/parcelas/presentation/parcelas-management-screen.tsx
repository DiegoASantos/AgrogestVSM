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
import { parcelasService } from "../services/parcelas.service";
import type { ParcelaListItem } from "../types/parcelas.types";
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

type ParcelaFormState = {
  id: string | null;
  sectorId: string;
  code: string;
  name: string;
  areaHectares: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: ParcelaFormState = {
  id: null,
  sectorId: "",
  code: "",
  name: "",
  areaHectares: "",
  description: "",
  status: "active"
};

export function ParcelasManagementScreen() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<ParcelaListItem[]>([]);
  const [sectores, setSectores] = useState<SectorListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ParcelaFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] = useState<ParcelaListItem | null>(
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

  const sectoresLookup = useMemo(
    () =>
      sectores.reduce<Record<string, string>>((accumulator, sector) => {
        accumulator[sector.id] = buildSectorLabel(sector);
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
        item.code.toLowerCase().includes(normalizedSearch) ||
        (item.name ?? "").toLowerCase().includes(normalizedSearch) ||
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

  const columns: DataTableColumn<ParcelaListItem>[] = [
    {
      key: "parcela",
      header: "Parcela",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.code}</strong>
          <span>{item.name || "Sin nombre"}</span>
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
      key: "area",
      header: "Área",
      cell: (item) => item.areaHectares ? `${item.areaHectares} ha` : "Sin área"
    },
    {
      key: "geo",
      header: "Geodatos",
      cell: (item) => (item.geo.hasGeodata ? "Registrados" : "Sin geodatos")
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
            href={`/mantenimiento/parcelas/${item.id}/geodatos`}
          >
            Geodatos
          </Link>
          <Link
            className="ui-button ui-button--ghost ui-button--compact"
            href={`/visitas/parcelas/${item.id}`}
          >
            Historial
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
      const [nextItems, nextSectores] = await Promise.all([
        parcelasService.getAll(session),
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

  function handleEdit(item: ParcelaListItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      sectorId: item.sectorId,
      code: item.code,
      name: item.name ?? "",
      areaHectares: item.areaHectares ?? "",
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
    const code = formState.code.trim();
    const name = formState.name.trim();
    const areaHectares = formState.areaHectares.trim();
    const description = formState.description.trim();

    if (!sectorId || !code) {
      setFormError("Sector y código de parcela son obligatorios.");
      return;
    }

    if (areaHectares && (!Number.isFinite(Number(areaHectares)) || Number(areaHectares) <= 0)) {
      setFormError("El área debe ser un número mayor que cero.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        sectorId,
        code,
        name: name || null,
        areaHectares: areaHectares || null,
        description: description || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await parcelasService.update(session, formState.id, payload);
        setSuccessMessage("Parcela actualizada correctamente.");
      } else {
        await parcelasService.create(session, payload);
        setSuccessMessage("Parcela creada correctamente.");
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
      await parcelasService.remove(session, itemToDeactivate.id);
      setSuccessMessage("Parcela desactivada correctamente.");

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
              Nueva parcela
            </button>
          </>
        }
        description="Gestión administrativa de parcelas asociadas a sectores."
        eyebrow="Mantenimiento"
        title="Parcelas"
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
            placeholder="Código, nombre, descripción o sector"
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
                {buildSectorLabel(sector)}
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
        <LoadingState description="Cargando parcelas..." />
      ) : null}

      {!listError && !isLoading && sectores.length === 0 ? (
        <EmptyState
          description="Primero debes registrar al menos un sector para poder crear parcelas."
          title="Sin sectores disponibles"
        />
      ) : null}

      {!listError &&
      !isLoading &&
      sectores.length > 0 &&
      filteredItems.length === 0 ? (
        <EmptyState
          description="No hay parcelas cargadas o los filtros no devolvieron coincidencias."
          title="No se encontraron parcelas"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Listado administrativo de parcelas."
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
        title={formState.id ? "Editar parcela" : "Nueva parcela"}
        description="Crea o edita parcelas relacionándolas con un sector."
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
              form="parcelas-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.id
                  ? "Guardar cambios"
                  : "Crear parcela"}
            </button>
          </>
        }
      >
        <form className="form-layout" id="parcelas-form" onSubmit={handleSubmit}>
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
                  {buildSectorLabel(sector)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Código</span>
            <input
              maxLength={30}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  code: event.target.value
                }))
              }
              placeholder="PAR-001"
              value={formState.code}
            />
          </label>

          <label className="field-group">
            <span>Nombre</span>
            <input
              maxLength={150}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value
                }))
              }
              placeholder="Parcela Norte"
              value={formState.name}
            />
          </label>

          <label className="field-group">
            <span>Área en hectáreas</span>
            <input
              inputMode="decimal"
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  areaHectares: event.target.value
                }))
              }
              placeholder="12.5000"
              value={formState.areaHectares}
            />
          </label>

          <label className="field-group">
            <span>Descripción</span>
            <textarea
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  description: event.target.value
                }))
              }
              placeholder="Descripción de la parcela"
              value={formState.description}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  status: event.target.value as ParcelaFormState["status"]
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
            ? `Se desactivará la parcela ${itemToDeactivate.code}. Podrá reactivarse más adelante.`
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
        title="Desactivar parcela"
        variant="warning"
      />
    </article>
  );
}

function buildSectorLabel(sector: SectorListItem) {
  return `${sector.name} - Productor ${sector.productorId}`;
}
