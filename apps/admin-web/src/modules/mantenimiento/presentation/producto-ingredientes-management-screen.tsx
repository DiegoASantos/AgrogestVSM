"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
import { productFormulationsService } from "../services/product-formulations.service";
import type {
  ActiveIngredientItem,
  ProductIngredientItem,
  ProductItem
} from "../types/product-formulations.types";
import { normalizeSearch } from "./catalog-screen.helpers";

type ProductIngredientFormState = {
  currentProductId: string | null;
  currentIngredientActiveId: string | null;
  productId: string;
  ingredientActiveId: string;
};

const emptyForm: ProductIngredientFormState = {
  currentProductId: null,
  currentIngredientActiveId: null,
  productId: "",
  ingredientActiveId: ""
};

export function ProductoIngredientesManagementScreen() {
  const searchParams = useSearchParams();
  const { session, logout } = useAuthSession();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeIngredients, setActiveIngredients] = useState<ActiveIngredientItem[]>(
    []
  );
  const [items, setItems] = useState<ProductIngredientItem[]>([]);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState(
    searchParams.get("productoId") ?? ""
  );
  const [ingredientFilter, setIngredientFilter] = useState(
    searchParams.get("ingredientActiveId") ?? ""
  );
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductIngredientFormState>(emptyForm);
  const [itemToDelete, setItemToDelete] = useState<ProductIngredientItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setProductFilter(searchParams.get("productoId") ?? "");
    setIngredientFilter(searchParams.get("ingredientActiveId") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [session]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.product.name.toLowerCase().includes(normalizedSearch) ||
        item.ingredientActive.name.toLowerCase().includes(normalizedSearch);

      const matchesProduct =
        productFilter.length === 0 || item.productId === productFilter;
      const matchesIngredient =
        ingredientFilter.length === 0 ||
        item.ingredientActiveId === ingredientFilter;

      return matchesSearch && matchesProduct && matchesIngredient;
    });
  }, [ingredientFilter, items, productFilter, search]);

  const columns: DataTableColumn<ProductIngredientItem>[] = [
    {
      key: "product",
      header: "Producto",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.product.name}</strong>
          <span>{item.product.isActive ? "Activo" : "Inactivo"}</span>
        </div>
      )
    },
    {
      key: "ingredient",
      header: "Ingrediente activo",
      cell: (item) => (
        <div className="table-copy">
          <strong>{item.ingredientActive.name}</strong>
          <span>{item.ingredientActive.isActive ? "Activo" : "Inactivo"}</span>
        </div>
      )
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
            onClick={() => setItemToDelete(item)}
            type="button"
          >
            Eliminar
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
      const [nextProducts, nextIngredients, nextItems] = await Promise.all([
        productFormulationsService.getProducts(session),
        productFormulationsService.getActiveIngredients(session),
        productFormulationsService.getProductIngredients(session)
      ]);
      setProducts(nextProducts);
      setActiveIngredients(nextIngredients);
      setItems(nextItems);
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

  function handleEdit(item: ProductIngredientItem) {
    setFormError(null);
    setSuccessMessage(null);
    setFormState({
      currentProductId: item.productId,
      currentIngredientActiveId: item.ingredientActiveId,
      productId: item.productId,
      ingredientActiveId: item.ingredientActiveId
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const productId = formState.productId.trim();
    const ingredientActiveId = formState.ingredientActiveId.trim();

    if (!productId || !ingredientActiveId) {
      setFormError("Producto e ingrediente activo son obligatorios.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        productId,
        ingredientActiveId
      };

      if (formState.currentProductId && formState.currentIngredientActiveId) {
        await productFormulationsService.updateProductIngredient(
          session,
          formState.currentProductId,
          formState.currentIngredientActiveId,
          payload
        );
        setSuccessMessage("Relacion producto ingrediente actualizada correctamente.");
      } else {
        await productFormulationsService.createProductIngredient(session, payload);
        setSuccessMessage("Relacion producto ingrediente creada correctamente.");
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

  async function handleDeleteConfirm() {
    if (!session || !itemToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      await productFormulationsService.deleteProductIngredient(
        session,
        itemToDelete.productId,
        itemToDelete.ingredientActiveId
      );
      setSuccessMessage("Relacion producto ingrediente eliminada correctamente.");

      if (
        formState.currentProductId === itemToDelete.productId &&
        formState.currentIngredientActiveId === itemToDelete.ingredientActiveId
      ) {
        setFormState(emptyForm);
      }

      setItemToDelete(null);
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

  const hasBaseCatalogs = products.length > 0 && activeIngredients.length > 0;

  return (
    <article className="panel">
      <ToolbarActions
        actions={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => void loadData()} type="button">
              Recargar
            </button>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.mantenimientoItems.productos}>
              Ver productos
            </Link>
            <Link className="ui-button ui-button--secondary" href={adminRoutes.mantenimientoItems.ingredientesActivos}>
              Ver ingredientes
            </Link>
            <button className="ui-button ui-button--primary" onClick={() => { resetForm(); setModalOpen(true); }} type="button">
              Nueva relacion
            </button>
          </>
        }
        description="Gestion simple de la relacion entre productos e ingredientes activos."
        eyebrow="Mantenimiento"
        title="Formulaciones"
      />

      <FilterBar
        actions={
          <button
            className="ui-button ui-button--ghost"
            onClick={() => {
              setSearch("");
              setProductFilter("");
              setIngredientFilter("");
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
            placeholder="Producto o ingrediente"
            value={search}
          />
        </label>

        <label className="field-group">
          <span>Producto</span>
          <select
            onChange={(event) => setProductFilter(event.target.value)}
            value={productFilter}
          >
            <option value="">Todos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group">
          <span>Ingrediente activo</span>
          <select
            onChange={(event) => setIngredientFilter(event.target.value)}
            value={ingredientFilter}
          >
            <option value="">Todos</option>
            {activeIngredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
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
        <LoadingState description="Cargando productos, ingredientes y formulaciones..." />
      ) : null}

      {!listError && !isLoading && !hasBaseCatalogs ? (
        <EmptyState
          description="Necesitas al menos un producto y un ingrediente activo para registrar relaciones."
          title="Catalogos base incompletos"
        />
      ) : null}

      {!listError && !isLoading && hasBaseCatalogs && filteredItems.length === 0 ? (
        <EmptyState
          description="No hay relaciones registradas o los filtros no devolvieron coincidencias."
          title="Sin relaciones"
        />
      ) : null}

      {!listError && !isLoading && filteredItems.length > 0 ? (
        <DataTable
          caption="Relaciones producto ingrediente."
          columns={columns}
          getRowKey={(row) => `${row.productId}-${row.ingredientActiveId}`}
          rows={filteredItems}
        />
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={() => { resetForm(); setModalOpen(false); }}
        title={
          formState.currentProductId && formState.currentIngredientActiveId
            ? "Editar formulacion"
            : "Nueva formulacion"
        }
        description="Crea o edita una relacion simple entre producto e ingrediente activo."
        footer={
          <>
            <button className="ui-button ui-button--ghost" onClick={() => { resetForm(); setModalOpen(false); }} type="button">
              Cancelar
            </button>
            <button
              className="ui-button ui-button--primary"
              disabled={isSaving || !hasBaseCatalogs}
              form="producto-ingredientes-form"
              type="submit"
            >
              {isSaving
                ? "Guardando..."
                : formState.currentProductId && formState.currentIngredientActiveId
                  ? "Guardar cambios"
                  : "Crear relacion"}
            </button>
          </>
        }
      >
        <form
          className="form-layout"
          id="producto-ingredientes-form"
          onSubmit={handleSubmit}
        >
          <label className="field-group">
            <span>Producto</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  productId: event.target.value
                }))
              }
              value={formState.productId}
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Ingrediente activo</span>
            <select
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  ingredientActiveId: event.target.value
                }))
              }
              value={formState.ingredientActiveId}
            >
              <option value="">Selecciona un ingrediente activo</option>
              {activeIngredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
          </label>
        </form>
        {formError ? <p className="form-error">{formError}</p> : null}
      </FormModal>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Eliminar permanentemente"
        description={
          itemToDelete
            ? "Esta accion eliminara permanentemente esta relacion. Esta operacion no se puede deshacer."
            : ""
        }
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setItemToDelete(null);
          }
        }}
        onConfirm={() => void handleDeleteConfirm()}
        open={itemToDelete !== null}
        title="Eliminar formulacion"
      />
    </article>
  );
}
