"use client";

import { FormEvent, useMemo, useState } from "react";
import { ConfirmDialog } from "../../../shared/components/confirm-dialog";
import { DataTable, DataTableColumn } from "../../../shared/components/data-table";
import { EmptyState } from "../../../shared/components/empty-state";
import { ErrorState } from "../../../shared/components/error-state";
import { FilterBar } from "../../../shared/components/filter-bar";
import { FormCard } from "../../../shared/components/form-card";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";

type DemoRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
};

type DemoFormState = {
  id: string | null;
  code: string;
  name: string;
  status: "active" | "inactive";
};

const initialRows: DemoRow[] = [
  {
    id: "cultivo-1",
    code: "ARROZ",
    name: "Arroz",
    isActive: true,
    updatedAt: "Actualizado hoy"
  },
  {
    id: "cultivo-2",
    code: "MAIZ",
    name: "Maiz amarillo duro",
    isActive: true,
    updatedAt: "Actualizado ayer"
  },
  {
    id: "cultivo-3",
    code: "ALGOD",
    name: "Algodon",
    isActive: false,
    updatedAt: "Actualizado hace 4 dias"
  }
];

const emptyForm: DemoFormState = {
  id: null,
  code: "",
  name: "",
  status: "active"
};

export function CrudPatternExample() {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formState, setFormState] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<DemoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        row.code.toLowerCase().includes(search.trim().toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && row.isActive) ||
        (statusFilter === "inactive" && !row.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const columns: DataTableColumn<DemoRow>[] = [
    {
      key: "name",
      header: "Nombre",
      cell: (row) => (
        <div className="table-copy">
          <strong>{row.name}</strong>
          <span>{row.updatedAt}</span>
        </div>
      )
    },
    {
      key: "code",
      header: "Codigo",
      cell: (row) => row.code
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <span className={`table-badge ${row.isActive ? "" : "table-badge--muted"}`}>
          {row.isActive ? "Activo" : "Inactivo"}
        </span>
      )
    },
    {
      key: "actions",
      header: "Acciones",
      className: "data-table__actions",
      cell: (row) => (
        <div className="table-actions">
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => handleEdit(row)}
            type="button"
          >
            Editar
          </button>
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => setRowToDelete(row)}
            type="button"
          >
            Eliminar
          </button>
        </div>
      )
    }
  ];

  function handleEdit(row: DemoRow) {
    setFormError(null);
    setFormState({
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.isActive ? "active" : "inactive"
    });
  }

  function resetForm() {
    setFormError(null);
    setFormState(emptyForm);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setListError(null);
  }

  function handleRefresh() {
    setListError(null);
    setIsRefreshing(true);

    window.setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = formState.code.trim().toUpperCase();
    const name = formState.name.trim();

    if (!code || !name) {
      setFormError("Codigo y nombre son obligatorios en un alta o edicion simple.");
      return;
    }

    const nextRow: DemoRow = {
      id: formState.id ?? `demo-${Date.now()}`,
      code,
      name,
      isActive: formState.status === "active",
      updatedAt: formState.id ? "Actualizado hace un momento" : "Creado hace un momento"
    };

    setRows((currentRows) => {
      if (!formState.id) {
        return [nextRow, ...currentRows];
      }

      return currentRows.map((currentRow) =>
        currentRow.id === formState.id ? nextRow : currentRow
      );
    });

    resetForm();
  }

  function handleDeleteConfirm() {
    if (!rowToDelete) {
      return;
    }

    setIsDeleting(true);

    window.setTimeout(() => {
      setRows((currentRows) =>
        currentRows.filter((currentRow) => currentRow.id !== rowToDelete.id)
      );
      setIsDeleting(false);
      setRowToDelete(null);

      if (formState.id === rowToDelete.id) {
        resetForm();
      }
    }, 250);
  }

  return (
    <article className="panel">
      <ToolbarActions
        actions={
          <>
            <button className="ui-button ui-button--ghost" onClick={handleRefresh} type="button">
              Recargar ejemplo
            </button>
            <button
              className="ui-button ui-button--secondary"
              onClick={() =>
                setListError(
                  "Este error de ejemplo deja listo el patron para reintentos basicos en tablas administrativas."
                )
              }
              type="button"
            >
              Simular error
            </button>
            <button className="ui-button ui-button--primary" onClick={resetForm} type="button">
              Nuevo registro
            </button>
          </>
        }
        description="Ejemplo local para listar, filtrar, crear, editar y eliminar sin armar un framework de CRUD."
        eyebrow="Base reusable"
        title="Patron minimo para modulos de mantenimiento y seguridad"
      />

      <section className="crud-example__grid">
        <div className="crud-example__main">
          <FilterBar
            actions={
              <button className="ui-button ui-button--ghost" onClick={clearFilters} type="button">
                Limpiar filtros
              </button>
            }
          >
            <label className="field-group">
              <span>Buscar</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o codigo"
                value={search}
              />
            </label>

            <label className="field-group">
              <span>Estado</span>
              <select
                onChange={(event) => setStatusFilter(event.target.value)}
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
                  onClick={() => setListError(null)}
                  type="button"
                >
                  Reintentar
                </button>
              }
              description={listError}
            />
          ) : null}

          {!listError && isRefreshing ? (
            <LoadingState description="Esta carga breve muestra el patron visual para los listados administrativos." />
          ) : null}

          {!listError && !isRefreshing && filteredRows.length === 0 ? (
            <EmptyState
              action={
                <button
                  className="ui-button ui-button--secondary"
                  onClick={clearFilters}
                  type="button"
                >
                  Restablecer listado
                </button>
              }
              description="Puedes reutilizar este bloque cuando el catalogo no tenga registros o los filtros no devuelvan coincidencias."
              title="No hay registros para mostrar"
            />
          ) : null}

          {!listError && !isRefreshing && filteredRows.length > 0 ? (
            <DataTable
              caption="Catalogo demo para mostrar el patron CRUD."
              columns={columns}
              getRowKey={(row) => row.id}
              rows={filteredRows}
            />
          ) : null}
        </div>

        <FormCard
          description="Sirve para altas o ediciones simples con un bloque visible y poco acoplado."
          eyebrow="Formulario"
          footer={
            <div className="actions">
              <button className="ui-button ui-button--ghost" onClick={resetForm} type="button">
                Limpiar
              </button>
              <button className="ui-button ui-button--primary" form="crud-demo-form" type="submit">
                {formState.id ? "Guardar cambios" : "Crear registro"}
              </button>
            </div>
          }
          title={formState.id ? "Editar item demo" : "Nuevo item demo"}
        >
          <form className="form-layout" id="crud-demo-form" onSubmit={handleSubmit}>
            <div className="field-grid">
              <label className="field-group">
                <span>Codigo</span>
                <input
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      code: event.target.value
                    }))
                  }
                  placeholder="ARROZ"
                  value={formState.code}
                />
              </label>

              <label className="field-group">
                <span>Estado</span>
                <select
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      status: event.target.value as DemoFormState["status"]
                    }))
                  }
                  value={formState.status}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>

            <label className="field-group">
              <span>Nombre</span>
              <input
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    name: event.target.value
                  }))
                }
                placeholder="Nombre visible del catalogo"
                value={formState.name}
              />
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}
          </form>
        </FormCard>
      </section>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Eliminar"
        description={
          rowToDelete
            ? `Se eliminara el registro ${rowToDelete.name}. Usa este patron cuando una accion ya no deba deshacerse por accidente.`
            : ""
        }
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setRowToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        open={rowToDelete !== null}
        title="Confirmar eliminacion"
      />
    </article>
  );
}
