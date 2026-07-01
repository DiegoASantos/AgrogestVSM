"use client";

import Link from "next/link";
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
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { agriculturalCatalogsService } from "../../mantenimiento/services/agricultural-catalogs.service";
import type { CatalogOption } from "../../mantenimiento/types/agricultural-catalogs.types";
import {
  buildOptionsLookup,
  matchesStatusFilter,
  normalizeSearch,
  renderStatusBadge,
  type StatusFilter
} from "../../mantenimiento/presentation/catalog-screen.helpers";
import { productoresService } from "../services/productores.service";
import type {
  ProductorEntityType,
  ProductorListItem
} from "../types/productores.types";

type ProductorFormState = {
  id: string | null;
  entityType: ProductorEntityType;
  documentTypeId: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  status: "active" | "inactive";
};

const emptyForm: ProductorFormState = {
  id: null,
  entityType: "persona",
  documentTypeId: "",
  documentNumber: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  status: "active"
};

const PRODUCTOR_ENTITY_LABELS: Record<ProductorEntityType, string> = {
  persona: "Persona",
  fundo: "Fundo",
  cooperativa: "Cooperativa"
};

export function ProductoresOverview() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<ProductorListItem[]>([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<CatalogOption[]>(
    []
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductorFormState>(emptyForm);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<ProductorListItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const documentTypeLookup = useMemo(
    () => buildOptionsLookup(documentTypeOptions),
    [documentTypeOptions]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const documentTypeLabel =
        item.documentTypeId === null
          ? ""
          : documentTypeLookup[String(item.documentTypeId)] ??
            String(item.documentTypeId);
      const entityLabel = PRODUCTOR_ENTITY_LABELS[item.entityType];
      const producerLabel = buildProductorDisplayName(item);

      const matchesSearch =
        normalizedSearch.length === 0 ||
        (item.documentNumber ?? "").toLowerCase().includes(normalizedSearch) ||
        producerLabel.toLowerCase().includes(normalizedSearch) ||
        entityLabel.toLowerCase().includes(normalizedSearch) ||
        (item.firstName ?? "").toLowerCase().includes(normalizedSearch) ||
        (item.lastName ?? "").toLowerCase().includes(normalizedSearch) ||
        (item.email ?? "").toLowerCase().includes(normalizedSearch) ||
        (item.address ?? "").toLowerCase().includes(normalizedSearch) ||
        documentTypeLabel.toLowerCase().includes(normalizedSearch);

      return matchesSearch && matchesStatusFilter(item.isActive, statusFilter);
    });
  }, [documentTypeLookup, items, search, statusFilter]);

  const columns: DataTableColumn<ProductorListItem>[] = [
    {
      key: "document",
      header: "Productor",
      cell: (item) => (
        <div className="table-copy">
          <strong>{buildProductorDisplayName(item)}</strong>
          <span>{buildProductorDocumentLabel(item, documentTypeLookup)}</span>
        </div>
      )
    },
    {
      key: "entityType",
      header: "Entidad",
      cell: (item) => PRODUCTOR_ENTITY_LABELS[item.entityType]
    },
    {
      key: "contact",
      header: "Contacto",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.phone || "No registrado"}</strong>
          <span>{item.email || item.publicId}</span>
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
            href={`/mantenimiento/productores/${item.id}`}
          >
            Sectores
          </Link>
          <Link
            className="ui-button ui-button--ghost ui-button--compact"
            href={`/visitas/productores/${item.id}`}
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
      const [nextItems, nextDocumentTypes] = await Promise.all([
        productoresService.getAll(session),
        agriculturalCatalogsService.getTiposDocumento(session)
      ]);
      setItems(nextItems);
      setDocumentTypeOptions(
        nextDocumentTypes.map((item) => ({
          id: item.id,
          label: `${item.code} - ${item.name}`
        }))
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

  function handleEdit(item: ProductorListItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      id: item.id,
      entityType: item.entityType,
      documentTypeId: item.documentTypeId === null ? "" : String(item.documentTypeId),
      documentNumber: item.documentNumber ?? "",
      firstName: item.firstName ?? "",
      lastName: item.lastName ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      address: item.address ?? "",
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

    const documentTypeId = Number(formState.documentTypeId);
    const documentNumber = formState.documentNumber.trim();
    const firstName = formState.firstName.trim();
    const lastName = formState.lastName.trim();
    const phone = formState.phone.trim();
    const email = formState.email.trim().toLowerCase();
    const address = formState.address.trim();

    if (
      formState.entityType === "persona" &&
      (!Number.isInteger(documentTypeId) || documentTypeId < 1 || !documentNumber)
    ) {
      setFormError("Tipo de documento y numero de documento son obligatorios.");
      return;
    }

    if (formState.entityType !== "persona" && !firstName) {
      setFormError("El nombre es obligatorio para fundos y cooperativas.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        entityType: formState.entityType,
        documentTypeId: formState.entityType === "persona" ? documentTypeId : null,
        documentNumber: formState.entityType === "persona" ? documentNumber : null,
        firstName: firstName || null,
        lastName: formState.entityType === "persona" ? lastName || null : null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        isActive: formState.status === "active"
      };

      if (formState.id) {
        await productoresService.update(session, formState.id, payload);
        setSuccessMessage("Productor actualizado correctamente.");
      } else {
        await productoresService.create(session, payload);
        setSuccessMessage("Productor creado correctamente.");
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
      await productoresService.remove(session, itemToDeactivate.id);
      setSuccessMessage("Productor desactivado correctamente.");

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
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <>
              <button className="ui-button ui-button--ghost" onClick={() => void loadData()} type="button">
                Recargar
              </button>
              <Link className="ui-button ui-button--secondary" href={adminRoutes.mantenimiento}>
                Volver a mantenimiento
              </Link>
              <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
                Nuevo productor
              </button>
            </>
          }
          description="CRUD base de productores y acceso directo a sus sectores."
          eyebrow="Mantenimiento"
          title="Productores"
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
              placeholder="Documento, correo o direccion"
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
              <button className="ui-button ui-button--secondary" onClick={() => void loadData()} type="button">
                Reintentar
              </button>
            }
            description={listError}
          />
        ) : null}

        {!listError && isLoading ? (
          <LoadingState description="Cargando productores..." />
        ) : null}

        {!listError && !isLoading && filteredItems.length === 0 ? (
          <EmptyState
            description="No hay productores cargados o la busqueda no devolvio coincidencias."
            title="No se encontraron productores"
          />
        ) : null}

        {!listError && !isLoading && filteredItems.length > 0 ? (
          <DataTable
            caption="Listado administrativo de productores."
            columns={columns}
            getRowKey={(row) => row.id}
            rows={filteredItems}
          />
        ) : null}

        <FormModal
          open={modalOpen}
          onClose={() => { resetForm(); setModalOpen(false); }}
          title={formState.id ? "Editar productor" : "Nuevo productor"}
          description="Alta o edicion simple de productores."
          footer={
            <>
              <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
                Cancelar
              </button>
              <button
                className="ui-button ui-button--primary"
                disabled={isSaving}
                form="productores-form"
                type="submit"
              >
                {isSaving
                  ? "Guardando..."
                  : formState.id
                    ? "Guardar cambios"
                    : "Crear productor"}
              </button>
            </>
          }
        >
          <form className="form-layout" id="productores-form" onSubmit={handleSubmit}>
            <label className="field-group">
              <span>Entidad</span>
              <select
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    entityType: event.target.value as ProductorEntityType,
                    documentTypeId:
                      event.target.value === "persona"
                        ? currentState.documentTypeId
                        : "",
                    documentNumber:
                      event.target.value === "persona"
                        ? currentState.documentNumber
                        : "",
                    lastName:
                      event.target.value === "persona" ? currentState.lastName : ""
                  }))
                }
                value={formState.entityType}
              >
                <option value="persona">Persona</option>
                <option value="fundo">Fundo</option>
                <option value="cooperativa">Cooperativa</option>
              </select>
            </label>

            {formState.entityType === "persona" ? (
              <>
                <label className="field-group">
                  <span>Tipo de documento</span>
                  <select
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        documentTypeId: event.target.value
                      }))
                    }
                    value={formState.documentTypeId}
                  >
                    <option value="">Selecciona un tipo</option>
                    {documentTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Numero de documento</span>
                  <input
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        documentNumber: event.target.value
                      }))
                    }
                    placeholder="12345678"
                    value={formState.documentNumber}
                  />
                </label>
              </>
            ) : null}

            <div className="field-grid">
              <label className="field-group">
                <span>{formState.entityType === "persona" ? "Nombres" : "Nombre"}</span>
                <input
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      firstName: event.target.value
                    }))
                  }
                  placeholder={
                    formState.entityType === "persona" ? "Juan" : "Fundo La Esperanza"
                  }
                  value={formState.firstName}
                />
              </label>

              {formState.entityType === "persona" ? (
                <label className="field-group">
                  <span>Apellidos</span>
                  <input
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        lastName: event.target.value
                      }))
                    }
                    placeholder="Perez"
                    value={formState.lastName}
                  />
                </label>
              ) : null}
            </div>

            <div className="field-grid">
              <label className="field-group">
                <span>Telefono</span>
                <input
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      phone: event.target.value
                    }))
                  }
                  placeholder="999888777"
                  value={formState.phone}
                />
              </label>

              <label className="field-group">
                <span>Correo</span>
                <input
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      email: event.target.value
                    }))
                  }
                  placeholder="productor@correo.com"
                  value={formState.email}
                />
              </label>
            </div>

            <label className="field-group">
              <span>Direccion</span>
              <textarea
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    address: event.target.value
                  }))
                }
                placeholder="Direccion del productor"
                value={formState.address}
              />
            </label>

            <label className="field-group">
              <span>Estado</span>
              <select
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    status: event.target.value as ProductorFormState["status"]
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
            ? `Se desactivara el productor ${buildProductorDisplayName(itemToDeactivate)}. Podra reactivarse mas adelante.`
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

function buildFullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function buildProductorDisplayName(productor: ProductorListItem) {
  return (
    buildFullName(productor.firstName, productor.lastName) ||
    productor.documentNumber ||
    productor.publicId
  );
}

function buildProductorDocumentLabel(
  productor: ProductorListItem,
  documentTypeLookup: Record<string, string>
) {
  if (productor.entityType !== "persona") {
    return PRODUCTOR_ENTITY_LABELS[productor.entityType];
  }

  const documentTypeLabel =
    productor.documentTypeId === null
      ? "Tipo no registrado"
      : documentTypeLookup[String(productor.documentTypeId)] ??
        `Tipo ${productor.documentTypeId}`;

  return `${documentTypeLabel} - ${productor.documentNumber ?? "Sin documento"}`;
}
