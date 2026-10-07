"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import type {
  DetallePagoProductor,
  DetallePagoProductorPayload,
  PagoCatalogs,
  PagoProductor,
  PagoProductorPayload,
  PagoProductorStatus
} from "../types/pagos.types";
import styles from "./pagos.module.css";

const TABS = ["Resumen", "Productores", "Cosecha", "Transportistas"] as const;
type Tab = (typeof TABS)[number];
type PaymentForm = Record<keyof PagoProductorPayload, string>;
type DetailForm = {
  acreedorId: string;
  tipoDocumentoProductor: string;
  nroDocumentoProductor: string;
  cantidadJabas: string;
  precioJaba: string;
  precioKilo: string;
  porcentajePeso: string;
  aplicaFairtrade: boolean;
  supervisorId: string;
  subTotal: string;
  tipoDescuento: string;
  montoDescuento: string;
  totalPostDescuento: string;
  detraccion: string;
  totalPostDetraccion: string;
  nroLiquidacion: string;
  observacion: string;
};

const emptyPayment: PaymentForm = {
  productorId: "",
  sistemaOrigen: "",
  nroGuia: "",
  lote: "",
  protocolo: "",
  variedad: "",
  tipoCultivo: "",
  categoria: "",
  destino: "",
  fechaCosecha: "",
  fechaRecepcion: "",
  jabas: "0",
  pesoBruto: "0.00",
  pesoTara: "0.00",
  pesoNeto: "0.00",
  pesoPromedio: "0.00",
  exportador: "",
  codigoProductorOrigen: "",
  nombreProductorOrigen: ""
};
const emptyDetail: DetailForm = {
  acreedorId: "",
  tipoDocumentoProductor: "DNI",
  nroDocumentoProductor: "",
  cantidadJabas: "0",
  precioJaba: "0.00",
  precioKilo: "0.00",
  porcentajePeso: "0.00",
  aplicaFairtrade: false,
  supervisorId: "",
  subTotal: "0.00",
  tipoDescuento: "NO_APLICA",
  montoDescuento: "0.00",
  totalPostDescuento: "0.00",
  detraccion: "0.00",
  totalPostDetraccion: "0.00",
  nroLiquidacion: "",
  observacion: ""
};
const paymentFields: Array<{ key: keyof PaymentForm; label: string; type?: string }> = [
  { key: "sistemaOrigen", label: "Sistema de origen" },
  { key: "nroGuia", label: "N.º de guía" },
  { key: "lote", label: "Lote" },
  { key: "protocolo", label: "Protocolo" },
  { key: "variedad", label: "Variedad" },
  { key: "tipoCultivo", label: "Tipo de cultivo" },
  { key: "categoria", label: "Categoría" },
  { key: "destino", label: "Destino" },
  { key: "fechaCosecha", label: "Fecha de cosecha", type: "date" },
  { key: "fechaRecepcion", label: "Fecha de recepción", type: "date" },
  { key: "jabas", label: "Jabas", type: "number" },
  { key: "pesoBruto", label: "Peso bruto", type: "number" },
  { key: "pesoTara", label: "Peso tara", type: "number" },
  { key: "pesoNeto", label: "Peso neto", type: "number" },
  { key: "pesoPromedio", label: "Peso promedio", type: "number" },
  { key: "exportador", label: "Exportador" },
  { key: "codigoProductorOrigen", label: "Código de productor de origen" },
  { key: "nombreProductorOrigen", label: "Nombre de productor de origen" }
];
const detailFields: Array<{
  key: keyof Omit<DetailForm, "acreedorId" | "supervisorId" | "aplicaFairtrade">;
  label: string;
  type?: string;
}> = [
  { key: "tipoDocumentoProductor", label: "Documento del productor" },
  { key: "nroDocumentoProductor", label: "N.º de documento del productor" },
  { key: "cantidadJabas", label: "Cantidad de jabas", type: "number" },
  { key: "precioJaba", label: "Precio por jaba", type: "number" },
  { key: "precioKilo", label: "Precio por kilo", type: "number" },
  { key: "porcentajePeso", label: "Porcentaje de peso", type: "number" },
  { key: "subTotal", label: "Subtotal ingresado", type: "number" },
  { key: "tipoDescuento", label: "Tipo de descuento" },
  { key: "montoDescuento", label: "Monto de descuento", type: "number" },
  { key: "totalPostDescuento", label: "Total después del descuento", type: "number" },
  { key: "detraccion", label: "Detracción", type: "number" },
  { key: "totalPostDetraccion", label: "Total después de detracción", type: "number" },
  { key: "nroLiquidacion", label: "N.º de liquidación" },
  { key: "observacion", label: "Observación" }
];
const statusLabel: Record<PagoProductorStatus, string> = {
  BORRADOR: "Borrador",
  OBSERVADO: "Observado",
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  ANULADO: "Anulado"
};

export function PagosProductoresOverview() {
  const { session } = useAuthSession();
  const [tab, setTab] = useState<Tab>("Productores");
  const [catalogs, setCatalogs] = useState<PagoCatalogs | null>(null);
  const [payments, setPayments] = useState<PagoProductor[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<PagoProductor | null>(null);
  const [approvedCreditors, setApprovedCreditors] = useState<
    Array<{ id: string; nombre: string }>
  >([]);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPayment);
  const [paymentStatus, setPaymentStatus] = useState<PagoProductorStatus>("BORRADOR");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [detailForm, setDetailForm] = useState<DetailForm>(emptyDetail);
  const [detailStatus, setDetailStatus] = useState<PagoProductorStatus>("PENDIENTE");
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailFormOpen, setDetailFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const [lookups, result] = await Promise.all([
        pagosService.catalogs(session),
        pagosService.list(session, page)
      ]);
      setCatalogs(lookups);
      setPayments(result.items);
      setTotal(result.total);
    } catch {
      setError("No se pudieron cargar los pagos. Actualiza e inténtalo nuevamente.");
    }
  }, [session, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / 50));
  const selectedProducerName = useMemo(
    () =>
      catalogs?.productores.find((item) => item.id === selected?.productorId)?.nombre ??
      selected?.productorNombre ??
      "",
    [catalogs, selected]
  );

  function beginCreate() {
    setSelected(null);
    setPaymentForm({ ...emptyPayment, productorId: catalogs?.productores[0]?.id ?? "" });
    setPaymentStatus("BORRADOR");
    setEditingPaymentId(null);
    setFormOpen(true);
    setMessage("");
  }

  async function beginEdit(item: PagoProductor) {
    if (!session) return;
    setError("");
    try {
      const full = await pagosService.get(session, item.id);
      setSelected(full);
      setPaymentForm(toPaymentForm(full));
      setPaymentStatus(full.estado);
      setEditingPaymentId(full.id);
      setFormOpen(true);
    } catch {
      setError("No se pudo abrir el pago para editarlo.");
    }
  }

  async function openPayment(item: PagoProductor) {
    if (!session) return;
    try {
      const [full, creditors] = await Promise.all([
        pagosService.get(session, item.id),
        pagosService.approvedCreditors(session, item.id)
      ]);
      setSelected(full);
      setApprovedCreditors(creditors);
      setError("");
    } catch {
      setError("No se pudo abrir el detalle del pago.");
    }
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload: PagoProductorPayload = {
        ...paymentForm,
        jabas: Number(paymentForm.jabas)
      };
      const saved = editingPaymentId
        ? await pagosService.update(session, editingPaymentId, {
            ...payload,
            estado: paymentStatus
          })
        : await pagosService.create(session, payload);
      setFormOpen(false);
      setMessage(editingPaymentId ? "Pago actualizado." : "Pago creado como borrador.");
      await load();
      if (editingPaymentId) await openPayment(saved);
    } catch {
      setError("No se pudo guardar el pago. Revisa los campos e inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function removePayment(item: PagoProductor) {
    if (
      !session ||
      !window.confirm(
        `¿Eliminar el pago de guía ${item.nroGuia}? Si tiene detalles, se conservarán anulados.`
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await pagosService.remove(session, item.id);
      setMessage(
        result.eliminado
          ? "Borrador eliminado."
          : "Pago y detalles anulados; se conservó el historial."
      );
      if (selected?.id === item.id) setSelected(null);
      await load();
    } catch {
      setError("No se pudo eliminar el pago.");
    } finally {
      setBusy(false);
    }
  }

  function beginCreateDetail() {
    setDetailForm({
      ...emptyDetail,
      acreedorId: approvedCreditors[0]?.id ?? "",
      supervisorId: catalogs?.supervisores[0]?.id ?? ""
    });
    setDetailStatus("PENDIENTE");
    setEditingDetailId(null);
    setDetailFormOpen(true);
  }

  function beginEditDetail(item: DetallePagoProductor) {
    setDetailForm({
      acreedorId: item.acreedorId,
      tipoDocumentoProductor: item.tipoDocumentoProductor,
      nroDocumentoProductor: item.nroDocumentoProductor,
      cantidadJabas: String(item.cantidadJabas),
      precioJaba: item.precioJaba,
      precioKilo: item.precioKilo,
      porcentajePeso: item.porcentajePeso,
      aplicaFairtrade: item.aplicaFairtrade,
      supervisorId: item.supervisorId,
      subTotal: item.subTotal,
      tipoDescuento: item.tipoDescuento,
      montoDescuento: item.montoDescuento,
      totalPostDescuento: item.totalPostDescuento,
      detraccion: item.detraccion,
      totalPostDetraccion: item.totalPostDetraccion,
      nroLiquidacion: item.nroLiquidacion ?? "",
      observacion: item.observacion
    });
    setDetailStatus(item.estado);
    setEditingDetailId(item.id);
    setDetailFormOpen(true);
  }

  async function saveDetail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selected) return;
    setBusy(true);
    setError("");
    try {
      const payload: DetallePagoProductorPayload = {
        ...detailForm,
        cantidadJabas: Number(detailForm.cantidadJabas),
        nroLiquidacion: detailForm.nroLiquidacion || null
      };
      if (editingDetailId)
        await pagosService.updateDetail(session, selected.id, editingDetailId, {
          ...payload,
          estado: detailStatus
        });
      else await pagosService.createDetail(session, selected.id, payload);
      setDetailFormOpen(false);
      setMessage(
        "Detalle guardado. Los importes se conservaron tal como fueron ingresados."
      );
      await openPayment(selected);
      await load();
    } catch {
      setError(
        "No se pudo guardar el detalle. Verifica que el acreedor esté aprobado y los datos sean válidos."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeDetail(item: DetallePagoProductor) {
    if (
      !session ||
      !selected ||
      !window.confirm("¿Anular este detalle? La fila quedará en el historial.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await pagosService.removeDetail(session, selected.id, item.id);
      await openPayment(selected);
      await load();
      setMessage("Detalle anulado y conservado.");
    } catch {
      setError("No se pudo anular el detalle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Administración · Finanzas de campo</span>
          <h1>Pagos</h1>
          <p>Registro manual de liquidaciones y distribución por acreedor.</p>
        </div>
        {tab === "Productores" && (
          <button className={styles.primary} onClick={beginCreate} type="button">
            Nuevo pago
          </button>
        )}
      </header>

      <nav className={styles.tabs} aria-label="Secciones de pagos">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={tab === item ? "page" : undefined}
            onClick={() => {
              setTab(item);
              setSelected(null);
              setMessage("");
            }}
            className={tab === item ? styles.activeTab : ""}
          >
            {item}
          </button>
        ))}
      </nav>

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

      {tab !== "Productores" ? (
        <div className={styles.empty}>
          <strong>{tab}</strong>
          <p>Esta pestaña estará disponible en una próxima entrega.</p>
        </div>
      ) : (
        <>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Liquidaciones de productores</h2>
              <p>{total} registros · Los importes se guardan como fueron ingresados.</p>
            </div>
            <button
              className={styles.secondary}
              onClick={() => void load()}
              type="button"
            >
              Actualizar
            </button>
          </div>
          {payments.length === 0 ? (
            <div className={styles.empty}>
              <strong>No hay pagos registrados</strong>
              <p>Crea una liquidación manual para comenzar.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Recepción</th>
                    <th>Productor</th>
                    <th>Guía / Lote</th>
                    <th>Variedad</th>
                    <th>Jabas</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.fechaRecepcion}</td>
                      <td>{item.productorNombre}</td>
                      <td>
                        {item.nroGuia}
                        <small>{item.lote}</small>
                      </td>
                      <td>{item.variedad}</td>
                      <td>{item.jabas}</td>
                      <td>
                        <span
                          className={`${styles.status} ${styles[`status${item.estado}`]}`}
                        >
                          {statusLabel[item.estado]}
                        </span>
                      </td>
                      <td className={styles.actions}>
                        <button type="button" onClick={() => void openPayment(item)}>
                          Detalles
                        </button>
                        <button type="button" onClick={() => void beginEdit(item)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void removePayment(item)}
                          disabled={busy}
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
              Página {page} de {pageCount}
            </span>
            <button
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Siguiente
            </button>
          </div>

          {selected && (
            <section className={styles.detailPanel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    Guía {selected.nroGuia} · {selected.lote}
                  </span>
                  <h2>Detalles para {selectedProducerName}</h2>
                  <p>Los importes son manuales y no se calculan entre sí.</p>
                </div>
                <div className={styles.panelActions}>
                  <button
                    className={styles.secondary}
                    onClick={() => void beginEdit(selected)}
                    type="button"
                  >
                    Editar cabecera
                  </button>
                  <button
                    className={styles.primary}
                    onClick={beginCreateDetail}
                    type="button"
                    disabled={selected.estado === "ANULADO"}
                  >
                    Añadir detalle
                  </button>
                </div>
              </div>
              {(selected.detalles ?? []).length === 0 ? (
                <div className={styles.empty}>
                  <p>Este borrador aún no tiene detalles.</p>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Acreedor</th>
                        <th>Jabas</th>
                        <th>% peso</th>
                        <th>Subtotal</th>
                        <th>Total ingresado</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.detalles?.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {item.acreedorNombre}
                            <small>
                              {item.tipoDocumentoProductor} {item.nroDocumentoProductor}
                            </small>
                          </td>
                          <td>{item.cantidadJabas}</td>
                          <td>{item.porcentajePeso}%</td>
                          <td>S/ {item.subTotal}</td>
                          <td>S/ {item.totalPostDetraccion}</td>
                          <td>
                            <span
                              className={`${styles.status} ${styles[`status${item.estado}`]}`}
                            >
                              {statusLabel[item.estado]}
                            </span>
                          </td>
                          <td className={styles.actions}>
                            <button
                              type="button"
                              onClick={() => beginEditDetail(item)}
                              disabled={
                                item.estado === "ANULADO" || selected.estado === "ANULADO"
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeDetail(item)}
                              disabled={item.estado === "ANULADO" || busy}
                            >
                              Anular
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {formOpen && (
        <div className={styles.backdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-form-title"
          >
            <div className={styles.modalHeading}>
              <div>
                <h2 id="payment-form-title">
                  {editingPaymentId ? "Editar pago" : "Nuevo pago de productor"}
                </h2>
                <p>Completa los datos manualmente. No se derivan importes.</p>
              </div>
              <button
                className={styles.close}
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form onSubmit={savePayment}>
              <label className={styles.field}>
                <span>Productor</span>
                <select
                  required
                  value={paymentForm.productorId}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      productorId: event.target.value
                    }))
                  }
                >
                  <option value="">Selecciona un productor</option>
                  {catalogs?.productores.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                      {item.activo ? "" : " · Inactivo"}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.formGrid}>
                {paymentFields.map((field) => (
                  <label key={field.key} className={styles.field}>
                    <span>{field.label}</span>
                    <input
                      required
                      maxLength={field.key === "lote" ? 150 : undefined}
                      type={field.type ?? "text"}
                      step={
                        field.type === "number" && field.key !== "jabas"
                          ? "0.01"
                          : undefined
                      }
                      value={paymentForm[field.key]}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
                          ...current,
                          [field.key]: event.target.value
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              {editingPaymentId && (
                <label className={styles.field}>
                  <span>Estado</span>
                  <select
                    value={paymentStatus}
                    onChange={(event) =>
                      setPaymentStatus(event.target.value as PagoProductorStatus)
                    }
                  >
                    {Object.keys(statusLabel).map((status) => (
                      <option key={status} value={status}>
                        {statusLabel[status as PagoProductorStatus]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className={styles.modalActions}>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => setFormOpen(false)}
                >
                  Cancelar
                </button>
                <button className={styles.primary} disabled={busy} type="submit">
                  {busy ? "Guardando…" : "Guardar pago"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detailFormOpen && selected && (
        <div className={styles.backdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-form-title"
          >
            <div className={styles.modalHeading}>
              <div>
                <h2 id="detail-form-title">
                  {editingDetailId ? "Editar detalle" : "Nuevo detalle"}
                </h2>
                <p>
                  El acreedor debe estar aprobado y pertenecer al productor de la
                  cabecera.
                </p>
              </div>
              <button
                className={styles.close}
                type="button"
                onClick={() => setDetailFormOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form onSubmit={saveDetail}>
              <label className={styles.field}>
                <span>Acreedor aprobado</span>
                <select
                  required
                  value={detailForm.acreedorId}
                  onChange={(event) =>
                    setDetailForm((current) => ({
                      ...current,
                      acreedorId: event.target.value
                    }))
                  }
                >
                  <option value="">Selecciona un acreedor</option>
                  {approvedCreditors.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Supervisor</span>
                <select
                  required
                  value={detailForm.supervisorId}
                  onChange={(event) =>
                    setDetailForm((current) => ({
                      ...current,
                      supervisorId: event.target.value
                    }))
                  }
                >
                  <option value="">Selecciona un supervisor</option>
                  {catalogs?.supervisores.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Fairtrade</span>
                <input
                  type="checkbox"
                  checked={detailForm.aplicaFairtrade}
                  onChange={(event) =>
                    setDetailForm((current) => ({
                      ...current,
                      aplicaFairtrade: event.target.checked
                    }))
                  }
                />
              </label>
              <div className={styles.formGrid}>
                {detailFields.map((field) => (
                  <label key={field.key} className={styles.field}>
                    <span>{field.label}</span>
                    {field.key === "tipoDocumentoProductor" ? (
                      <select
                        required
                        value={detailForm.tipoDocumentoProductor}
                        onChange={(event) =>
                          setDetailForm((current) => ({
                            ...current,
                            tipoDocumentoProductor: event.target.value
                          }))
                        }
                      >
                        {catalogs?.tiposDocumento
                          .filter(
                            (item) => item.codigo === "DNI" || item.codigo === "RUC"
                          )
                          .map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {item.codigo}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        required={field.key !== "nroLiquidacion"}
                        maxLength={field.key === "observacion" ? 300 : undefined}
                        type={field.type ?? "text"}
                        step={
                          field.type === "number" && field.key !== "cantidadJabas"
                            ? "0.01"
                            : undefined
                        }
                        min={field.key === "porcentajePeso" ? 0 : undefined}
                        max={field.key === "porcentajePeso" ? 100 : undefined}
                        value={detailForm[field.key]}
                        onChange={(event) =>
                          setDetailForm((current) => ({
                            ...current,
                            [field.key]: event.target.value
                          }))
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              {editingDetailId && (
                <label className={styles.field}>
                  <span>Estado</span>
                  <select
                    value={detailStatus}
                    onChange={(event) =>
                      setDetailStatus(event.target.value as PagoProductorStatus)
                    }
                  >
                    {Object.keys(statusLabel).map((status) => (
                      <option key={status} value={status}>
                        {statusLabel[status as PagoProductorStatus]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className={styles.modalActions}>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => setDetailFormOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.primary}
                  disabled={busy || approvedCreditors.length === 0}
                  type="submit"
                >
                  {busy ? "Guardando…" : "Guardar detalle"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function toPaymentForm(item: PagoProductor): PaymentForm {
  return {
    productorId: item.productorId,
    sistemaOrigen: item.sistemaOrigen,
    nroGuia: item.nroGuia,
    lote: item.lote,
    protocolo: item.protocolo,
    variedad: item.variedad,
    tipoCultivo: item.tipoCultivo,
    categoria: item.categoria,
    destino: item.destino,
    fechaCosecha: item.fechaCosecha,
    fechaRecepcion: item.fechaRecepcion,
    jabas: String(item.jabas),
    pesoBruto: item.pesoBruto,
    pesoTara: item.pesoTara,
    pesoNeto: item.pesoNeto,
    pesoPromedio: item.pesoPromedio,
    exportador: item.exportador,
    codigoProductorOrigen: item.codigoProductorOrigen,
    nombreProductorOrigen: item.nombreProductorOrigen
  };
}
