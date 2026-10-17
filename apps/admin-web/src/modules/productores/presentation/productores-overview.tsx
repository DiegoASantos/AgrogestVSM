"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ConfirmDialog } from "../../../shared/components/confirm-dialog";
import { DataTable, type DataTableColumn } from "../../../shared/components/data-table";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { FeedbackBanner } from "../../../shared/components/feedback-banner";
import { FilterBar } from "../../../shared/components/filter-bar";
import { ProductorFormModal } from "./productor-form-modal";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { agriculturalCatalogsService } from "../../mantenimiento/services/agricultural-catalogs.service";
import type { CatalogOption } from "../../mantenimiento/types/agricultural-catalogs.types";
import {
  buildOptionsLookup,
  renderStatusBadge,
  type StatusFilter
} from "../../mantenimiento/presentation/catalog-screen.helpers";
import { productoresService } from "../services/productores.service";
import type {
  ProductorEntityType,
  ProductorListItem
} from "../types/productores.types";

const PRODUCTOR_ENTITY_LABELS: Record<ProductorEntityType, string> = {
  persona: "Persona",
  fundo: "Fundo",
  cooperativa: "Cooperativa"
};
const PAGE_SIZE = 10;

export function ProductoresOverview() {
  const { session, logout } = useAuthSession();
  const [items, setItems] = useState<ProductorListItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<CatalogOption[]>(
    []
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductorListItem | null>(null);
  const [itemToDeactivate, setItemToDeactivate] =
    useState<ProductorListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData(page);
  }, [page, search, session, statusFilter]);

  const documentTypeLookup = useMemo(
    () => buildOptionsLookup(documentTypeOptions),
    [documentTypeOptions]
  );

  const fromItem = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(page * PAGE_SIZE, count);
  const resultsSummary = `${count} productor${count === 1 ? "" : "es"} encontrado${count === 1 ? "" : "s"}${
    count > 0 ? ` -- Mostrando ${fromItem} - ${toItem}` : ""
  }.`;

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

  async function loadData(currentPage = page) {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setListError(null);
      const [productoresPage, nextDocumentTypes] = await Promise.all([
        productoresService.getPage(session, {
          page: currentPage,
          limit: PAGE_SIZE,
          search,
          isActive: statusFilter === "all" ? undefined : statusFilter === "active"
        }),
        agriculturalCatalogsService.getTiposDocumento(session)
      ]);
      setItems(productoresPage.items);
      setCount(productoresPage.count);
      setTotalPages(productoresPage.totalPages);
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
    setEditing(item);
    setModalOpen(true);
  }

  async function handleDeactivateConfirm() {
    if (!session || !itemToDeactivate) {
      return;
    }

    try {
      setIsDeleting(true);
      await productoresService.remove(session, itemToDeactivate.id);
      setSuccessMessage("Productor desactivado correctamente.");

      if (editing?.id === itemToDeactivate.id) {
        setEditing(null);
      }

      setItemToDeactivate(null);
      await loadData(page);
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
              <button className="ui-button ui-button--ghost" onClick={() => void loadData(page)} type="button">
                Recargar
              </button>
              <Link className="ui-button ui-button--secondary" href={adminRoutes.mantenimiento}>
                Volver a mantenimiento
              </Link>
              <button className="ui-button ui-button--primary" onClick={() => { setEditing(null); setModalOpen(true); }} type="button">
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
                setPage(1);
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
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre, apellido o documento"
              value={search}
            />
          </label>

          <label className="field-group">
            <span>Estado</span>
            <select
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
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
              <button className="ui-button ui-button--secondary" onClick={() => void loadData(page)} type="button">
                Reintentar
              </button>
            }
            description={listError}
          />
        ) : null}

        {!listError && isLoading ? (
          <LoadingState description="Cargando productores..." />
        ) : null}

        {!listError && !isLoading && items.length === 0 ? (
          <EmptyState
            description="No hay productores cargados o la busqueda no devolvio coincidencias."
            title="No se encontraron productores"
          />
        ) : null}

        {!listError && !isLoading && items.length > 0 ? (
          <DataTable
            caption="Listado administrativo de productores."
            columns={columns}
            getRowKey={(row) => row.id}
            pagination={{
              loading: isLoading,
              onPageChange: setPage,
              page,
              summary: resultsSummary,
              totalPages
            }}
            rows={items}
          />
        ) : null}

        <ProductorFormModal open={modalOpen} session={session} initial={editing}
          documentTypeOptions={documentTypeOptions}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            setSuccessMessage(editing ? "Productor actualizado correctamente." : "Productor creado correctamente.");
            await loadData(page);
          }} />
      </article>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Desactivar"
        description={
          itemToDeactivate
            ? `Se desactivara el productor ${buildProductorDisplayName(itemToDeactivate)}. Solo es posible si no tiene parcelas activas.`
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
