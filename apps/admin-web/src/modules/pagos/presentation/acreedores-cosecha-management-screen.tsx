"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import type {
  AcreedorCosecha,
  AcreedorCosechaPayload,
  PagoCatalogs
} from "../types/pagos.types";
import styles from "./pagos.module.css";

type CreditorForm = {
  productorId: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: "DNI" | "RUC";
  nroDocumento: string;
  banco: AcreedorCosechaPayload["banco"];
  nroCuenta: string;
};
const emptyForm: CreditorForm = {
  productorId: "",
  nombres: "",
  apellidos: "",
  tipoDocumento: "DNI",
  nroDocumento: "",
  banco: "BCP",
  nroCuenta: ""
};
const statusLabels = {
  PENDING: "Pendiente de aprobación",
  APPROVED: "Aprobado",
  OBSERVED: "Observado"
};

export function AcreedoresCosechaManagementScreen() {
  const { session } = useAuthSession();
  const [catalogs, setCatalogs] = useState<PagoCatalogs | null>(null);
  const [items, setItems] = useState<AcreedorCosecha[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreditorForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const [lookups, result] = await Promise.all([
        pagosService.catalogs(session),
        pagosService.listCreditors(session, page, 50, search)
      ]);
      setCatalogs(lookups);
      setItems(result.items);
      setTotal(result.total);
    } catch {
      setError("No se pudo cargar el catálogo de acreedores.");
    }
  }, [session, page, search]);
  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm({ ...emptyForm, productorId: catalogs?.productores[0]?.id ?? "" });
    setEditingId(null);
    setIsOpen(true);
    setError("");
    setMessage("");
  }

  function openEdit(item: AcreedorCosecha) {
    setForm({
      productorId: item.productorId,
      nombres: item.nombres,
      apellidos: item.apellidos,
      tipoDocumento: item.tipoDocumento,
      nroDocumento: item.nroDocumento,
      banco: item.banco,
      nroCuenta: item.nroCuenta
    });
    setEditingId(item.id);
    setIsOpen(true);
    setError("");
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload: AcreedorCosechaPayload = form;
      await (editingId
        ? pagosService.updateCreditor(session, editingId, payload)
        : pagosService.createCreditor(session, payload));
      setIsOpen(false);
      setMessage(
        editingId
          ? "Acreedor actualizado. Si estaba aprobado, deberá revisarse nuevamente."
          : "Acreedor creado y enviado a aprobación."
      );
      await load();
    } catch {
      setError(
        "No se pudo guardar. Verifica documento, cuenta y que no exista un perfil duplicado para el productor."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: AcreedorCosecha) {
    if (
      !session ||
      !window.confirm(
        `¿Eliminar el perfil de ${item.nombres} ${item.apellidos}? Solo se permite cuando no tiene pagos, cosechas ni revisiones.`
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await pagosService.removeCreditor(session, item.id);
      setMessage("Acreedor eliminado.");
      await load();
    } catch {
      setError(
        "No se pudo eliminar. Puede estar referenciado por pagos, cosechas o historial de revisión."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Mantenimiento · Comercial</span>
          <h1>Acreedores de cosecha</h1>
          <p>
            Administra perfiles existentes. Los nuevos perfiles y cambios vuelven a
            revisión.
          </p>
        </div>
        <button className={styles.primary} onClick={openCreate} type="button">
          Nuevo acreedor
        </button>
      </header>
      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.sectionHeading}>
        <label className={styles.field} style={{ width: "min(100%, 390px)", margin: 0 }}>
          <span>Buscar por acreedor o productor</span>
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Nombre"
          />
        </label>
        <button className={styles.secondary} onClick={() => void load()} type="button">
          Actualizar
        </button>
      </div>
      {items.length === 0 ? (
        <div className={styles.empty}>
          <strong>No hay acreedores</strong>
          <p>No se encontraron perfiles para mostrar.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Acreedor</th>
                <th>Productor</th>
                <th>Documento</th>
                <th>Banco y cuenta</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.nombres} {item.apellidos}
                  </td>
                  <td>{item.productorNombre}</td>
                  <td>
                    {item.tipoDocumento} {item.nroDocumento}
                  </td>
                  <td>
                    {item.banco}
                    <small>{item.nroCuenta}</small>
                  </td>
                  <td>
                    <span
                      className={`${styles.status} ${item.estadoAprobacion === "APPROVED" ? styles.statusPAGADO : item.estadoAprobacion === "OBSERVED" ? styles.statusOBSERVADO : styles.statusPENDIENTE}`}
                    >
                      {statusLabels[item.estadoAprobacion]}
                    </span>
                  </td>
                  <td>{item.origen}</td>
                  <td className={styles.actions}>
                    <button type="button" onClick={() => openEdit(item)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(item)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={styles.pagination}>
        <button
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
          type="button"
        >
          Anterior
        </button>
        <span>
          {total} perfiles · Página {page} de {Math.max(1, Math.ceil(total / 50))}
        </span>
        <button
          disabled={page >= Math.max(1, Math.ceil(total / 50))}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          Siguiente
        </button>
      </div>

      {isOpen && (
        <div className={styles.backdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="creditor-form-title"
            style={{ width: "min(620px, 100%)" }}
          >
            <div className={styles.modalHeading}>
              <div>
                <h2 id="creditor-form-title">
                  {editingId ? "Editar acreedor" : "Nuevo acreedor"}
                </h2>
                <p>La cuenta bancaria solo está disponible para roles autorizados.</p>
              </div>
              <button
                className={styles.close}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form onSubmit={submit}>
              <label className={styles.field}>
                <span>Productor</span>
                <select
                  required
                  value={form.productorId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      productorId: event.target.value
                    }))
                  }
                >
                  <option value="">Selecciona productor</option>
                  {catalogs?.productores.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Nombres</span>
                  <input
                    required
                    maxLength={100}
                    value={form.nombres}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, nombres: event.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Apellidos</span>
                  <input
                    required
                    maxLength={100}
                    value={form.apellidos}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        apellidos: event.target.value
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Tipo de documento</span>
                  <select
                    value={form.tipoDocumento}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tipoDocumento: event.target.value as "DNI" | "RUC"
                      }))
                    }
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Número de documento</span>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={form.tipoDocumento === "DNI" ? 8 : 11}
                    minLength={form.tipoDocumento === "DNI" ? 8 : 11}
                    pattern="[0-9]+"
                    value={form.nroDocumento}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nroDocumento: event.target.value
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Banco</span>
                  <select
                    value={form.banco}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        banco: event.target.value as CreditorForm["banco"]
                      }))
                    }
                  >
                    <option value="BCP">BCP</option>
                    <option value="INTERBANK">Interbank</option>
                    <option value="CAJA_PIURA">Caja Piura</option>
                    <option value="BBVA">BBVA</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Número de cuenta o CCI</span>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={30}
                    pattern="[0-9]+"
                    value={form.nroCuenta}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nroCuenta: event.target.value
                      }))
                    }
                  />
                </label>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <button className={styles.primary} disabled={busy} type="submit">
                  {busy ? "Guardando…" : "Guardar acreedor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
