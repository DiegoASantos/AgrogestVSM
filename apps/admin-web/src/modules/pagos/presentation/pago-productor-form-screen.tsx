"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import type {
  AcreedorPago,
  DetallePagoProductor,
  DetallePagoProductorPayload,
  PagoCatalogs,
  PagoProductor,
  PagoProductorPayload,
  PagoProductorStatus
} from "../types/pagos.types";
import styles from "./pagos.module.css";

type HeaderDraft = Omit<PagoProductorPayload, "jabas"> & { jabas: string };
type DetailDraft = Omit<DetallePagoProductorPayload, "cantidadJabas"> & {
  cantidadJabas: string;
};
type DetailRow = {
  localId: string;
  id?: string;
  estado?: PagoProductorStatus;
  form: DetailDraft;
};

const blankHeader: HeaderDraft = {
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
const blankDetail: DetailDraft = {
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
  nroLiquidacion: null,
  observacion: ""
};
const headerFields: Array<{ key: keyof HeaderDraft; label: string; type?: string }> = [
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
const amountFields: Array<{
  key: keyof Omit<
    DetailDraft,
    | "acreedorId"
    | "tipoDocumentoProductor"
    | "nroDocumentoProductor"
    | "supervisorId"
    | "aplicaFairtrade"
  >;
  label: string;
  type?: string;
}> = [
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
const statusLabels: Record<PagoProductorStatus, string> = {
  BORRADOR: "Borrador",
  OBSERVADO: "Observado",
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  ANULADO: "Anulado"
};
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export function PagoProductorFormScreen() {
  const params = useParams<{ id?: string }>();
  const paymentId = typeof params?.id === "string" ? params.id : undefined;
  const isEditing = Boolean(paymentId);
  const { session } = useAuthSession();
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<PagoCatalogs | null>(null);
  const [payment, setPayment] = useState<PagoProductor | null>(null);
  const [header, setHeader] = useState<HeaderDraft>(blankHeader);
  const [status, setStatus] = useState<PagoProductorStatus>("BORRADOR");
  const [creditors, setCreditors] = useState<AcreedorPago[]>([]);
  const [rows, setRows] = useState<DetailRow[]>([
    { localId: newId(), form: { ...blankDetail } }
  ]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creditorRevision, setCreditorRevision] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const lookups = await pagosService.catalogs(session);
      setCatalogs(lookups);
      if (!paymentId) {
        setHeader((current) => ({
          ...current,
          productorId: current.productorId || lookups.productores[0]?.id || ""
        }));
        return;
      }
      const full = await pagosService.get(session, paymentId);
      setPayment(full);
      setStatus(full.estado);
      setHeader({
        productorId: full.productorId,
        sistemaOrigen: full.sistemaOrigen,
        nroGuia: full.nroGuia,
        lote: full.lote,
        protocolo: full.protocolo,
        variedad: full.variedad,
        tipoCultivo: full.tipoCultivo,
        categoria: full.categoria,
        destino: full.destino,
        fechaCosecha: full.fechaCosecha,
        fechaRecepcion: full.fechaRecepcion,
        jabas: String(full.jabas),
        pesoBruto: full.pesoBruto,
        pesoTara: full.pesoTara,
        pesoNeto: full.pesoNeto,
        pesoPromedio: full.pesoPromedio,
        exportador: full.exportador,
        codigoProductorOrigen: full.codigoProductorOrigen,
        nombreProductorOrigen: full.nombreProductorOrigen
      });
      setRows(
        (full.detalles ?? []).filter((item) => item.estado !== "ANULADO").map(toRow)
      );
    } catch {
      setError("No se pudo cargar el formulario. Actualiza e inténtalo nuevamente.");
    }
  }, [session, paymentId]);
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!session || !header.productorId) {
      setCreditors([]);
      return;
    }
    let current = true;
    setCreditors([]);
    void pagosService
      .approvedCreditorsByProducer(session, header.productorId)
      .then((items) => {
        if (current) setCreditors(items);
      })
      .catch(() => {
        if (current) setError("No se pudieron cargar los acreedores aprobados.");
      });
    return () => {
      current = false;
    };
  }, [session, header.productorId, creditorRevision]);

  const producer = useMemo(
    () =>
      catalogs?.productores.find((item) => item.id === header.productorId)?.nombre ??
      payment?.productorNombre ??
      "",
    [catalogs, header.productorId, payment]
  );
  const chosenCreditor = (creditorId: string) =>
    creditors.find((item) => item.id === creditorId);
  function updateRow(localId: string, update: Partial<DetailDraft>) {
    setRows((current) =>
      current.map((row) =>
        row.localId === localId ? { ...row, form: { ...row.form, ...update } } : row
      )
    );
  }
  function addRow() {
    setRows((current) => [
      ...current,
      {
        localId: newId(),
        form: {
          ...blankDetail,
          supervisorId: catalogs?.supervisores[0]?.id ?? ""
        }
      }
    ]);
  }
  function removeRow(row: DetailRow) {
    setRows((current) => current.filter((item) => item.localId !== row.localId));
    if (row.id) setRemovedIds((current) => [...current, row.id!]);
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busy) return;
    if (rows.length === 0) {
      setError("Agrega al menos un detalle para guardar el pago.");
      return;
    }
    const form = event.currentTarget;
    const invalidHeader = form
      .querySelector<HTMLDetailsElement>(`.${styles.formSection}`)
      ?.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
    if (invalidHeader) {
      invalidHeader.closest("details")?.setAttribute("open", "");
      invalidHeader.focus();
      invalidHeader.reportValidity();
      return;
    }
    const invalidRow = rows.findIndex(
      (row) => !row.form.acreedorId || !row.form.supervisorId
    );
    if (invalidRow >= 0) {
      setError(
        `Detalle ${invalidRow + 1}: selecciona un acreedor aprobado y un supervisor agrónomo.`
      );
      form.querySelector(`.${styles.detailsSection}`)?.setAttribute("open", "");
      const cards = form.querySelectorAll<HTMLDetailsElement>(`.${styles.detailCard}`);
      cards[invalidRow]?.setAttribute("open", "");
      return;
    }
    const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
    if (invalid) {
      invalid.closest(`.${styles.formSection}`)?.setAttribute("open", "");
      invalid.closest("details")?.setAttribute("open", "");
      invalid.focus();
      invalid.reportValidity();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const cabecera = { ...header, jabas: Number(header.jabas) } as PagoProductorPayload;
      const mapPayload = (form: DetailDraft): DetallePagoProductorPayload => ({
        ...form,
        cantidadJabas: Number(form.cantidadJabas),
        nroLiquidacion: form.nroLiquidacion || null
      });
      const saved = paymentId
        ? await pagosService.updateComplete(session, paymentId, {
            cabecera: { ...cabecera, estado: status },
            detalles: rows.map((row) => ({
              ...mapPayload(row.form),
              ...(row.id ? { id: row.id, estado: row.estado } : {})
            })),
            anularIds: removedIds
          })
        : await pagosService.createComplete(session, {
            cabecera,
            detalles: rows.map((row) => mapPayload(row.form))
          });
      setPayment(saved);
      setRemovedIds([]);
      setNotice("Pago guardado con todos sus detalles.");
      if (!paymentId) router.replace(`/pagos/productores/${saved.id}/editar`);
      else await load();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el pago. Revisa los campos e inténtalo nuevamente."
      );
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof HeaderDraft, label: string, type = "text") => (
    <label className={styles.field} key={key}>
      <span>{label}</span>
      <input
        required
        type={type}
        step={type === "number" && key !== "jabas" ? "0.01" : undefined}
        value={header[key]}
        onChange={(event) =>
          setHeader((current) => ({ ...current, [key]: event.target.value }))
        }
      />
    </label>
  );
  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Pagos · Productores · {isEditing ? "Edición" : "Nuevo registro"}
          </span>
          <h1>
            {isEditing
              ? `Pago ${payment?.nroGuia ? `· Guía ${payment.nroGuia}` : ""}`
              : "Nuevo pago de productor"}
          </h1>
          <p>
            Completa la cabecera y los detalles. Guarda todo el pago en una sola acción.
          </p>
        </div>
        <button
          className={styles.secondary}
          type="button"
          onClick={() => router.push("/pagos")}
        >
          Volver a pagos
        </button>
      </header>
      {notice && (
        <p className={styles.success} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <form onSubmit={savePayment} noValidate className={styles.paymentForm}>
        <details className={styles.formSection} open>
          <summary>
            <span>
              <strong>1. Cabecera del pago</strong>
              <small>Productor y datos de recepción de la cosecha</small>
            </span>
            <span>{payment ? "En edición" : "Nuevo"}</span>
          </summary>
          <div className={styles.sectionBody}>
            <label className={styles.field}>
              <span>Productor</span>
              <select
                required
                value={header.productorId}
                disabled={Boolean(paymentId && (payment?.detalles?.length ?? 0) > 0)}
                onChange={(event) => {
                  setHeader((current) => ({
                    ...current,
                    productorId: event.target.value
                  }));
                  setRows((current) =>
                    current.map((row) => ({
                      ...row,
                      form: {
                        ...row.form,
                        acreedorId: "",
                        tipoDocumentoProductor: "DNI",
                        nroDocumentoProductor: ""
                      }
                    }))
                  );
                }}
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
              {headerFields.map((item) => field(item.key, item.label, item.type))}
            </div>
            {paymentId && (
              <label className={styles.field}>
                <span>Estado del pago</span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as PagoProductorStatus)
                  }
                >
                  {Object.entries(statusLabels)
                    .filter(([key]) => key !== "ANULADO")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
        </details>
        <details className={`${styles.formSection} ${styles.detailsSection}`} open>
          <summary>
            <span>
              <strong>2. Detalles por acreedor</strong>
              <small>
                {producer || "Selecciona un productor"} · {rows.length}{" "}
                {rows.length === 1 ? "detalle" : "detalles"}
              </small>
            </span>
            <span>{rows.length ? `${rows.length} registros` : "Sin detalles"}</span>
          </summary>
          <div className={styles.sectionBody}>
            <>
              {creditors.length === 0 && (
                <div className={styles.helper}>
                  {header.productorId
                    ? "Este productor no tiene acreedores aprobados. Regístralos en Mantenimiento y vuelve a esta vista."
                    : "Selecciona un productor para consultar sus acreedores aprobados."}
                </div>
              )}
              {rows.map((row, index) => {
                const selected = chosenCreditor(row.form.acreedorId);
                return (
                  <details
                    className={styles.detailCard}
                    key={row.localId}
                    open={index === 0}
                  >
                    <summary>
                      <span>
                        <strong>
                          Detalle {index + 1} ·{" "}
                          {selected?.nombre || "Selecciona un acreedor"}
                        </strong>
                        <small>
                          {selected
                            ? `${selected.tipoDocumento} ${selected.nroDocumento}`
                            : "Completa los campos requeridos"}
                        </small>
                      </span>
                      <button
                        type="button"
                        className={styles.removeRow}
                        onClick={(event) => {
                          event.preventDefault();
                          removeRow(row);
                        }}
                      >
                        Quitar
                      </button>
                    </summary>
                    <div className={styles.cardBody}>
                      <div className={styles.detailIdentityGrid}>
                        <div className={styles.creditorSelect}>
                          <SearchableSelect
                            label="Acreedor aprobado"
                            value={row.form.acreedorId}
                            options={creditors.map((item) => ({
                              value: item.id,
                              label: item.nombre,
                              helper: `${item.tipoDocumento} ${item.nroDocumento}`
                            }))}
                            placeholder="Buscar nombre o documento"
                            emptyMessage="No hay acreedores aprobados."
                            disabled={
                              !header.productorId || payment?.estado === "ANULADO"
                            }
                            onChange={(value) => {
                              const creditor = chosenCreditor(value);
                              updateRow(row.localId, {
                                acreedorId: value,
                                tipoDocumentoProductor: creditor?.tipoDocumento ?? "DNI",
                                nroDocumentoProductor: creditor?.nroDocumento ?? ""
                              });
                            }}
                          />
                        </div>
                        <label className={styles.field}>
                          <span>Documento del acreedor</span>
                          <input
                            readOnly
                            value={
                              selected
                                ? `${selected.tipoDocumento} · ${selected.nroDocumento}`
                                : "Se completa al elegir acreedor"
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Supervisor agrónomo</span>
                          <select
                            required
                            value={row.form.supervisorId}
                            onChange={(event) =>
                              updateRow(row.localId, { supervisorId: event.target.value })
                            }
                          >
                            <option value="">Selecciona un agrónomo</option>
                            {catalogs?.supervisores.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.nombre}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.checkField}>
                          <input
                            type="checkbox"
                            checked={row.form.aplicaFairtrade}
                            onChange={(event) =>
                              updateRow(row.localId, {
                                aplicaFairtrade: event.target.checked
                              })
                            }
                          />
                          <span>Aplica Fairtrade</span>
                        </label>
                      </div>
                      <div className={styles.detailValuesGrid}>
                        {amountFields.map(({ key, label, type }) => (
                          <label className={styles.field} key={key}>
                            <span>{label}</span>
                            <input
                              required={key !== "nroLiquidacion"}
                              type={type ?? "text"}
                              min={key === "porcentajePeso" ? 0 : undefined}
                              max={key === "porcentajePeso" ? 100 : undefined}
                              step={
                                type === "number" && key !== "cantidadJabas"
                                  ? "0.01"
                                  : undefined
                              }
                              value={row.form[key] ?? ""}
                              onChange={(event) =>
                                updateRow(row.localId, {
                                  [key]: event.target.value
                                } as Partial<DetailDraft>)
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                );
              })}
              <div className={styles.detailActions}>
                <button className={styles.secondary} type="button" onClick={addRow}>
                  + Añadir detalle
                </button>
                <a
                  className={styles.maintenanceLink}
                  href="/mantenimiento/acreedores-cosecha"
                  target="_blank"
                  rel="noreferrer"
                >
                  Gestionar acreedores
                </a>
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={() => setCreditorRevision((value) => value + 1)}
                >
                  Actualizar lista
                </button>
              </div>
            </>
          </div>
        </details>
        <div className={styles.stickySave}>
          <span>
            Los montos son manuales. Se guardan la cabecera y todos los detalles juntos.
          </span>
          <button
            className={styles.primary}
            type="submit"
            disabled={busy || payment?.estado === "ANULADO"}
          >
            {busy ? "Guardando…" : "Guardar pago"}
          </button>
        </div>
      </form>
    </section>
  );
}

function toRow(item: DetallePagoProductor): DetailRow {
  return {
    localId: item.id,
    id: item.id,
    estado: item.estado,
    form: {
      acreedorId: item.acreedorId,
      tipoDocumentoProductor: item.tipoDocumentoAcreedor ?? item.tipoDocumentoProductor,
      nroDocumentoProductor: item.nroDocumentoAcreedor ?? item.nroDocumentoProductor,
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
      nroLiquidacion: item.nroLiquidacion,
      observacion: item.observacion
    }
  };
}
