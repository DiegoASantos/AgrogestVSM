"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import {
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "../../mantenimiento/presentation/catalog-screen.helpers";
import { sectoresService } from "../../sectores/services/sectores.service";
import type { SectorListItem } from "../../sectores/types/sectores.types";
import { subsectoresService } from "../../subsectores/services/subsectores.service";
import type { SubsectorListItem } from "../../subsectores/types/subsectores.types";
import { productoresService } from "../../productores/services/productores.service";
import type { ProductorListItem } from "../../productores/types/productores.types";
import { parcelasService } from "../services/parcelas.service";
import type { ParcelaListItem } from "../types/parcelas.types";
import { securityService } from "../../seguridad/services/security.service";
import type { SecurityUserItem } from "../../seguridad/types/security.types";
import { ConfirmDialog } from "../../../shared/components/confirm-dialog";
import { DataTable, type DataTableColumn } from "../../../shared/components/data-table";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { FilterBar } from "../../../shared/components/filter-bar";
import { FormModal } from "../../../shared/components/form-modal";
import { LoadingState } from "../../../shared/components/loading-state";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import { Toast, type ToastState } from "../../../shared/components/toast";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";

type ParcelaFormState = {
  id: string | null;
  sectorId: string;
  subsectorId: string;
  productorId: string;
  agronomoUsuarioId: string;
  name: string;
  areaHectares: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: ParcelaFormState = {
  id: null,
  sectorId: "",
  subsectorId: "",
  productorId: "",
  agronomoUsuarioId: "",
  name: "",
  areaHectares: "",
  description: "",
  status: "active"
};

export function ParcelasManagementScreen() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<ParcelaListItem[]>([]);
  const [sectores, setSectores] = useState<SectorListItem[]>([]);
  const [subsectores, setSubsectores] = useState<SubsectorListItem[]>([]);
  const [productores, setProductores] = useState<ProductorListItem[]>([]);
  const [agronomoUsers, setAgronomoUsers] = useState<SecurityUserItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [formState, setFormState] = useState<ParcelaFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] = useState<ParcelaListItem | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dismissToast = useCallback(() => setToast(null), []);

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

  const subsectoresLookup = useMemo(
    () =>
      subsectores.reduce<Record<string, SubsectorListItem>>(
        (accumulator, subsector) => {
          accumulator[subsector.id] = subsector;
          return accumulator;
        },
        {}
      ),
    [subsectores]
  );

  const productoresLookup = useMemo(
    () =>
      productores.reduce<Record<string, string>>((accumulator, productor) => {
        accumulator[productor.id] = buildProductorLabel(productor);
        return accumulator;
      }, {}),
    [productores]
  );

  const agronomoUsersLookup = useMemo(
    () =>
      agronomoUsers.reduce<Record<string, string>>((accumulator, user) => {
        accumulator[user.id] = user.displayName;
        return accumulator;
      }, {}),
    [agronomoUsers]
  );

  const agronomoUserOptions = useMemo(
    () =>
      agronomoUsers
        .filter((user) => user.isActive)
        .sort((leftUser, rightUser) =>
          leftUser.displayName.localeCompare(rightUser.displayName, "es")
        )
        .map((user) => ({
          value: user.id,
          label: user.displayName
        })),
    [agronomoUsers]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const sectorLabel = sectoresLookup[item.sectorId] ?? item.sectorId;
      const subsectorLabel =
        subsectoresLookup[item.subsectorId]?.name ?? item.subsectorId;
      const productorLabel =
        productoresLookup[item.productorId] ?? "";
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.code.toLowerCase().includes(normalizedSearch) ||
        (item.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
        subsectorLabel.toLowerCase().includes(normalizedSearch) ||
        sectorLabel.toLowerCase().includes(normalizedSearch) ||
        productorLabel.toLowerCase().includes(normalizedSearch);

      const matchesSector =
        sectorFilter.length === 0 || item.sectorId === sectorFilter;

      return (
        matchesSearch &&
        matchesSector &&
        matchesStatusFilter(item.isActive, statusFilter)
      );
    });
  }, [
    items,
    search,
    sectorFilter,
    sectoresLookup,
    statusFilter,
    subsectoresLookup,
    productoresLookup
  ]);

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
      key: "agronomo",
      header: "Agrónomo",
      cell: (item) =>
        item.agronomoUsuarioId
          ? agronomoUsersLookup[item.agronomoUsuarioId] || "Sin nombre"
          : "Sin asignar"
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
      key: "subsector",
      header: "Subsector",
      cell: (item) => (
        <div className="table-copy">
          <strong>
            {subsectoresLookup[item.subsectorId]?.name ?? `ID ${item.subsectorId}`}
          </strong>
          <span>{item.subsectorId}</span>
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
      const [nextItems, nextSectores, nextSubsectores, nextProductores] =
        await Promise.all([
          parcelasService.getAll(session),
          sectoresService.getAll(session),
          subsectoresService.getAll(session),
          productoresService.getAll(session)
        ]);
      setItems(nextItems);
      setSectores(nextSectores);
      setSubsectores(nextSubsectores);
      setProductores(nextProductores);

      const users = await securityService.getUsers(session);
      setAgronomoUsers(
        users.filter((user) =>
          user.roles.some((role) => role.code === "AGRONOMO")
        )
      );
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
    setFormState(emptyForm);
  }

  function handleEdit(item: ParcelaListItem) {
    setFormError(null);
    setFormState({
      id: item.id,
      sectorId: item.sectorId,
      subsectorId: item.subsectorId,
      productorId: item.productorId,
      agronomoUsuarioId: item.agronomoUsuarioId ?? "",
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
    const subsectorId = formState.subsectorId.trim();
    const productorId = formState.productorId.trim();
    const name = formState.name.trim();
    const areaHectares = formState.areaHectares.trim();
    const description = formState.description.trim();

    if (!sectorId || !subsectorId || !productorId) {
      const message = "Productor, sector y subsector son obligatorios.";

      setFormError(message);
      setToast({ kind: "error", message });
      return;
    }

    const duplicateParcela = findDuplicateParcela(items, {
      id: formState.id,
      productorId,
      sectorId,
      subsectorId,
      name
    });

    if (duplicateParcela) {
      const message = `Ya existe una parcela con el mismo productor, sector, subsector y nombre. Registro duplicado: ${duplicateParcela.code}.`;

      setFormError(message);
      setToast({ kind: "error", message });
      return;
    }

    if (areaHectares && (!Number.isFinite(Number(areaHectares)) || Number(areaHectares) <= 0)) {
      const message = "El área debe ser un número mayor que cero.";

      setFormError(message);
      setToast({ kind: "error", message });
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setToast(null);

    try {
      const payload = {
        subsectorId,
        productorId,
        name: name || null,
        areaHectares: areaHectares || null,
        description: description || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await parcelasService.update(session, formState.id, payload);
        await parcelasService.updateAgronomo(
          session,
          formState.id,
          formState.agronomoUsuarioId || null
        );
        setToast({
          kind: "success",
          message: "Parcela actualizada correctamente."
        });
      } else {
        const createdParcela = await parcelasService.create(session, payload);
        if (formState.agronomoUsuarioId) {
          await parcelasService.updateAgronomo(
            session,
            createdParcela.id,
            formState.agronomoUsuarioId
          );
        }
        setToast({
          kind: "success",
          message: "Parcela creada correctamente."
        });
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
      setToast({
        kind: "error",
        message: `No se pudo guardar la parcela. ${apiError.message}`
      });
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
      setToast({ kind: "success", message: "Parcela desactivada correctamente." });

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

      setToast({
        kind: "error",
        message: `No se pudo desactivar la parcela. ${apiError.message}`
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="panel">
      <Toast onDismiss={dismissToast} toast={toast} />

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
              href={adminRoutes.mantenimientoItems.subsectores}
            >
              Ver subsectores
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
        description="Gestion administrativa de parcelas asociadas a subsectores."
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
            placeholder="Codigo, nombre, descripcion, sector, subsector o productor"
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

      {!listError && !isLoading && subsectores.length === 0 ? (
        <EmptyState
          description="Primero debes registrar al menos un subsector para poder crear parcelas."
          title="Sin subsectores disponibles"
        />
      ) : null}

      {!listError &&
      !isLoading &&
      subsectores.length > 0 &&
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
        description="Crea o edita parcelas asociadas a un productor y subsector."
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
          <SearchableSelect
            emptyMessage="No hay productores disponibles."
            label="Productor"
            onChange={(value) =>
              setFormState((currentState) => ({
                ...currentState,
                productorId: value
              }))
            }
            options={productores.map((productor) => ({
              value: productor.id,
              label: buildProductorLabel(productor),
              helper: productor.documentNumber ?? productor.publicId
            }))}
            placeholder="Escribe para buscar un productor"
            value={formState.productorId}
          />

          <label className="field-group">
            <span>Sector</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  sectorId: event.target.value,
                  subsectorId: ""
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
            <span>Subsector</span>
            <select
              disabled={!formState.sectorId}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  subsectorId: event.target.value
                }))
              }
              value={formState.subsectorId}
            >
              <option value="">Selecciona un subsector</option>
              {subsectores
                .filter((subsector) => subsector.sectorId === formState.sectorId)
                .map((subsector) => (
                  <option key={subsector.id} value={subsector.id}>
                    {subsector.name}
                  </option>
                ))}
            </select>
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

          <label className="field-group">
            <span>Agrónomo</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  agronomoUsuarioId: event.target.value
                }))
              }
              value={formState.agronomoUsuarioId}
            >
              <option value="">Sin asignar</option>
              {agronomoUserOptions.map((user) => (
                <option key={user.value} value={user.value}>
                  {user.label}
                </option>
              ))}
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
  return sector.name;
}

function buildProductorLabel(productor: ProductorListItem) {
  const name = [productor.firstName, productor.lastName].filter(Boolean).join(" ").trim();

  if (productor.documentNumber && name) {
    return `${productor.documentNumber} - ${name}`;
  }

  return name || productor.documentNumber || productor.publicId;
}

function findDuplicateParcela(
  items: ParcelaListItem[],
  candidate: Pick<
    ParcelaFormState,
    "id" | "productorId" | "sectorId" | "subsectorId" | "name"
  >
) {
  const normalizedName = normalizeParcelaName(candidate.name);

  return (
    items.find(
      (item) =>
        item.id !== candidate.id &&
        item.productorId === candidate.productorId &&
        item.sectorId === candidate.sectorId &&
        item.subsectorId === candidate.subsectorId &&
        normalizeParcelaName(item.name ?? "") === normalizedName
    ) ?? null
  );
}

function normalizeParcelaName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE");
}
