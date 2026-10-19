"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import { calculatedAmounts, derivedPrice } from "../domain/calculo-detalle-pago";
import { RecepcionSystracePicker } from "./recepcion-systrace-picker";
import { AcreedorCosechaFormModal } from "./acreedor-cosecha-form-modal";
import { ProductorFormModal } from "../../productores/presentation/productor-form-modal";
import type {
  AcreedorCosecha,
  AcreedorPago,
  DetallePagoProductor,
  DetallePagoProductorPayload,
  PagoCatalogs,
  PagoProductor,
  PagoProductorPayload,
  PagoProductorStatus,
  RecepcionSystrace,
  SaldoRecepcionPago
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
  cantidadJabas: "1",
  precioJaba: "0.00",
  precioKilo: "0.00",
  precioBase: "JABA",
  porcentajePeso: "100.00",
  aplicaFairtrade: false,
  supervisorId: "",
  subTotal: "0.00",
  tipoDescuento: "NO_APLICA",
  montoDescuento: "0.00",
  totalPostDescuento: "0.00",
  detraccion: "0.00",
  totalPostDetraccion: "0.00",
  nroLiquidacion: null,
  observacion: "",
  fechaPago: null
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
const discountOptions = ["NO_APLICA", "CLP", "INSUMOS", "COMISION", "ANTICIPO"] as const;
const observationOptions = [
  "Cuenta bancaria inexistente o equivocada",
  "Datos personales inconsistentes",
  "Transaccion en proceso por CCI"
] as const;
const todayInLima = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
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
    { localId: newId(), estado: "PENDIENTE", form: { ...blankDetail } }
  ]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creditorRevision, setCreditorRevision] = useState(0);
  const [balance, setBalance] = useState<SaldoRecepcionPago | null>(null);
  const [balanceRevision, setBalanceRevision] = useState(0);
  const [producerModalOpen, setProducerModalOpen] = useState(false);
  const [creditorModalOpen, setCreditorModalOpen] = useState(false);
  const [creditorTargetRow, setCreditorTargetRow] = useState<string | null>(null);
  const [pendingCreditor, setPendingCreditor] = useState<AcreedorCosecha | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const lookups = await pagosService.catalogs(session);
      setCatalogs(lookups);
      if (!paymentId) {
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

  useEffect(() => {
    if (!session || !header.sistemaOrigen || !header.codigoProductorOrigen ||
      !header.nroGuia || !header.lote || !header.fechaRecepcion) {
      setBalance(null);
      return;
    }
    let active = true;
    setBalance(null);
    void pagosService.receptionBalance(session, {
      sistemaOrigen: header.sistemaOrigen,
      codigoProductorOrigen: header.codigoProductorOrigen,
      nroGuia: header.nroGuia,
      lote: header.lote,
      fechaRecepcion: header.fechaRecepcion
    }).then((value) => {
      if (active) setBalance(value);
    }).catch(() => {
      if (active) setBalance(null);
    });
    return () => { active = false; };
  }, [session, header.sistemaOrigen, header.codigoProductorOrigen,
    header.nroGuia, header.lote, header.fechaRecepcion, balanceRevision]);

  const producer = useMemo(
    () =>
      catalogs?.productores.find((item) => item.id === header.productorId)?.nombre ??
      payment?.productorNombre ??
      "",
    [catalogs, header.productorId, payment]
  );
  const chosenCreditor = (creditorId: string) =>
    creditors.find((item) => item.id === creditorId);
  const unchangedRow = (row: DetailRow) => {
    const original = payment?.detalles?.find((item) => item.id === row.id);
    if (!original) return false;
    return original.acreedorId === row.form.acreedorId &&
      original.supervisorId === row.form.supervisorId &&
      original.cantidadJabas === Number(row.form.cantidadJabas) &&
      Number(original.precioJaba) === Number(row.form.precioJaba) &&
      Number(original.precioKilo) === Number(row.form.precioKilo) &&
      Number(original.porcentajePeso) === Number(row.form.porcentajePeso) &&
      original.aplicaFairtrade === row.form.aplicaFairtrade &&
      original.tipoDescuento === row.form.tipoDescuento &&
      Number(original.montoDescuento) === Number(row.form.montoDescuento) &&
      Number(original.detraccion) === Number(row.form.detraccion) &&
      (original.nroLiquidacion ?? "") === (row.form.nroLiquidacion ?? "") &&
      original.observacion === row.form.observacion &&
      original.estado === row.estado &&
      original.fechaPago === (row.form.fechaPago ?? null);
  };
  const receivedCrates = balance?.jabasRecepcion ?? Number(header.jabas);
  const ownSavedCrates = (payment?.detalles ?? [])
    .filter((detail) => detail.estado !== "ANULADO")
    .reduce((sum, detail) => sum + detail.cantidadJabas, 0);
  const outsideCrates = Math.max(0, (balance?.asignadas ?? 0) - ownSavedCrates);
  const draftCrates = rows.reduce((sum, row) => sum + Number(row.form.cantidadJabas || 0), 0);
  const draftAvailable = receivedCrates - outsideCrates - draftCrates;
  function updateRow(localId: string, update: Partial<DetailDraft>) {
    setRows((current) =>
      current.map((row) => {
        if (row.localId !== localId) return row;
        const next = { ...row.form, ...update };
        if (update.precioJaba !== undefined) {
          next.precioBase = "JABA";
          next.precioKilo = derivedPrice(update.precioJaba, "JABA");
        }
        if (update.precioKilo !== undefined) {
          next.precioBase = "KILO";
          next.precioJaba = derivedPrice(update.precioKilo, "KILO");
        }
        if (update.tipoDescuento === "NO_APLICA") next.montoDescuento = "0.00";
        if (update.tipoDescuento && update.tipoDescuento !== "NO_APLICA" &&
          row.form.tipoDescuento === "NO_APLICA") next.montoDescuento = "";
        return { ...row, form: next };
      })
    );
  }
  function updateRowStatus(localId: string, estado: PagoProductorStatus) {
    setRows((current) => current.map((row) => row.localId === localId ? {
      ...row,
      estado,
      form: {
        ...row.form,
        observacion: estado === "OBSERVADO" ? row.form.observacion : "",
        fechaPago: estado === "PAGADO"
          ? row.form.fechaPago || todayInLima()
          : null
      }
    } : row));
  }
  function addRow() {
    setRows((current) => [
      ...current,
      {
        localId: newId(),
        estado: "PENDIENTE",
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

  function applyReception(reception: RecepcionSystrace, producerId: string) {
    if (!reception.cabecera) return;
    const producerChanged = header.productorId !== producerId;
    setHeader({
      ...reception.cabecera,
      productorId: producerId,
      jabas: String(reception.cabecera.jabas)
    });
    if (producerChanged) {
      setRows((current) => current.map((row) => ({
        ...row,
        form: {
          ...row.form,
          acreedorId: "",
          tipoDocumentoProductor: "DNI",
          nroDocumentoProductor: ""
        }
      })));
    }
    setError("");
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
    const invalidRow = rows.findIndex((row) => !unchangedRow(row) && (
      !row.form.acreedorId || !row.form.supervisorId ||
      (row.estado === "OBSERVADO" && !observationOptions.includes(row.form.observacion as typeof observationOptions[number])) ||
      (row.form.tipoDescuento !== "NO_APLICA" && Number(row.form.montoDescuento) <= 0)
    ));
    if (invalidRow >= 0) {
      const row = rows[invalidRow];
      const reason = !row.form.acreedorId ? "selecciona un acreedor aprobado" :
        !row.form.supervisorId ? "selecciona un supervisor agrónomo" :
          row.estado === "OBSERVADO" && !observationOptions.includes(row.form.observacion as typeof observationOptions[number])
            ? "selecciona una observación" : "ingresa un monto de descuento mayor que cero";
      setError(`Detalle ${invalidRow + 1}: ${reason}.`);
      form.querySelector(`.${styles.detailsSection}`)?.setAttribute("open", "");
      const cards = form.querySelectorAll<HTMLDetailsElement>(`.${styles.detailCard}`);
      cards[invalidRow]?.setAttribute("open", "");
      return;
    }
    if (!Number.isFinite(draftAvailable) || (draftAvailable < 0 && draftCrates > ownSavedCrates)) {
      setError(`Las jabas superan las recibidas para este lote. Disponibles tras este formulario: ${Math.max(0, draftAvailable)}.`);
      return;
    }
    const invalidPrice = rows.findIndex((row) => {
      if (unchangedRow(row)) return false;
      const price = row.form.precioBase === "KILO" ? row.form.precioKilo : row.form.precioJaba;
      return (price.split(".")[1]?.length ?? 0) > 4;
    });
    if (invalidPrice >= 0) {
      setError(`Detalle ${invalidPrice + 1}: el precio ingresado permite hasta cuatro decimales.`);
      return;
    }
    const invalidTotal = rows.findIndex((row) => {
      if (unchangedRow(row)) return false;
      const amounts = calculatedAmounts(row.form, header);
      return Number(amounts.totalPostDescuento) < 0 || Number(amounts.totalPostDetraccion) < 0;
    });
    if (invalidTotal >= 0) {
      setError(`Detalle ${invalidTotal + 1}: el descuento o la detracción supera el importe disponible.`);
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
      const mapPayload = (row: DetailRow): DetallePagoProductorPayload => ({
        ...row.form,
        ...calculatedAmounts(row.form, header),
        cantidadJabas: Number(row.form.cantidadJabas),
        nroLiquidacion: row.form.nroLiquidacion || null,
        estado: row.estado === "PAGADO" || row.estado === "OBSERVADO" || row.estado === "PENDIENTE"
          ? row.estado : row.estado === "BORRADOR" ? undefined : "PENDIENTE",
        fechaPago: row.estado === "PAGADO" ? row.form.fechaPago : null
      });
      const saved = paymentId
        ? await pagosService.updateComplete(session, paymentId, {
            cabecera: { ...cabecera, estado: status },
            detalles: rows.map((row) => ({
              ...mapPayload(row),
              ...(row.id ? { id: row.id } : {})
            })),
            anularIds: removedIds
          })
        : await pagosService.createComplete(session, {
            cabecera,
            detalles: rows.map(mapPayload)
          });
      setPayment(saved);
      setRemovedIds([]);
      setBalanceRevision((value) => value + 1);
      setNotice("Pago guardado con todos sus detalles.");
      router.replace("/pagos");
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
        min={key === "jabas" ? 1 : undefined}
        step={type === "number" && key !== "jabas" ? "0.01" : undefined}
        value={header[key]}
        readOnly={(
          header.sistemaOrigen === "SYSTRACE" && (key === "jabas" || key === "pesoNeto")
        ) || Boolean(payment?.detalles?.length && [
          "sistemaOrigen", "codigoProductorOrigen", "nroGuia", "lote",
          "fechaRecepcion", "jabas", "pesoNeto"
        ].includes(key))}
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
            {!isEditing && session && catalogs && (
              <RecepcionSystracePicker
                session={session}
                catalogs={catalogs}
                onApply={applyReception}
              />
            )}
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
            {!isEditing && <button className={styles.secondary} type="button"
              onClick={() => setProducerModalOpen(true)}>+ Nuevo productor</button>}
            <div className={styles.formGrid}>
              {headerFields.map((item) => field(item.key, item.label, item.type))}
            </div>
            {header.nroGuia && header.lote && (
              <div className={styles.helper} role="status">
                Jabas de recepción: {receivedCrates || 0} · Asignadas guardadas: {balance?.asignadas ?? 0}
                {" · "}Pagadas: {balance?.pagadas ?? 0} · Disponibles después de este formulario: {Math.max(0, draftAvailable)}
                {" · "}Pendientes de pago: {balance?.pendientesPago ?? receivedCrates}
                {balance?.completo ? " · Lote pagado completamente" : ""}
              </div>
            )}
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
                    ? "Este productor no tiene acreedores aprobados. Crea uno aquí y apruébalo para guardar el pago."
                    : "Selecciona un productor para consultar sus acreedores aprobados."}
                </div>
              )}
              {pendingCreditor && pendingCreditor.productorId === header.productorId &&
                pendingCreditor.estadoAprobacion === "PENDING" && <div className={styles.helper} role="status">
                  <strong>{pendingCreditor.nombres} {pendingCreditor.apellidos} está pendiente de aprobación.</strong>
                  <button className={styles.secondary} type="button" disabled={busy} onClick={async () => {
                    if (!session) return;
                    setBusy(true); setError("");
                    try {
                      const approved = await pagosService.reviewCreditor(session, pendingCreditor.id, "APPROVED");
                      setPendingCreditor(null);
                      setCreditorRevision((value) => value + 1);
                      setRows((current) => current.map((row) => row.localId === creditorTargetRow ? {
                        ...row, form: { ...row.form, acreedorId: approved.id,
                          tipoDocumentoProductor: approved.tipoDocumento,
                          nroDocumentoProductor: approved.nroDocumento }
                      } : row));
                      setNotice("Acreedor aprobado y seleccionado en el detalle.");
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : "No se pudo aprobar el acreedor.");
                    } finally { setBusy(false); }
                  }}>Aprobar acreedor</button>
                </div>}
              {rows.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr>
                      <th>Detalle</th><th>Jabas</th><th>Fairtrade</th><th>Estado</th><th>Fecha de pago</th>
                    </tr></thead>
                    <tbody>{rows.map((row, index) => (
                      <tr key={row.localId}>
                        <td>{index + 1} · {chosenCreditor(row.form.acreedorId)?.nombre ?? "Sin acreedor"}</td>
                        <td>{row.form.cantidadJabas}</td>
                        <td>{row.form.aplicaFairtrade ? "Sí" : "No"}</td>
                        <td>{statusLabels[row.estado ?? "PENDIENTE"]}</td>
                        <td>{row.estado === "PAGADO" ? row.form.fechaPago || "Por definir" : "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {rows.map((row, index) => {
                const selected = chosenCreditor(row.form.acreedorId);
                const amounts = calculatedAmounts(row.form, header);
                const historicalUnchanged = unchangedRow(row);
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
                          <button className={styles.secondary} type="button"
                            disabled={!header.productorId} onClick={() => {
                              setCreditorTargetRow(row.localId);
                              setCreditorModalOpen(true);
                            }}>+ Nuevo acreedor</button>
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
                        <label className={styles.field}>
                          <span>Estado del detalle</span>
                          <select
                            value={row.estado === "BORRADOR" ? "PENDIENTE" : row.estado ?? "PENDIENTE"}
                            onChange={(event) => updateRowStatus(row.localId, event.target.value as PagoProductorStatus)}
                          >
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="OBSERVADO">Observado</option>
                            <option value="PAGADO">Pagado</option>
                          </select>
                        </label>
                        {row.estado === "PAGADO" && (
                          <label className={styles.field}>
                            <span>Fecha de pago</span>
                            <input type="date"
                              required={!row.id || Boolean(payment?.detalles?.find((detail) => detail.id === row.id)?.fechaPago)}
                              value={row.form.fechaPago ?? ""}
                              onChange={(event) => updateRow(row.localId, { fechaPago: event.target.value })} />
                            {row.id && !row.form.fechaPago && <small>Fecha histórica no registrada</small>}
                          </label>
                        )}
                      </div>
                      <div className={styles.detailValuesGrid}>
                        {amountFields.map(({ key, label, type }) => {
                          if (key === "tipoDescuento") return (
                            <label className={styles.field} key={key}>
                              <span>{label}</span>
                              <select value={discountOptions.includes(row.form.tipoDescuento as typeof discountOptions[number])
                                ? row.form.tipoDescuento : ""} onChange={(event) =>
                                updateRow(row.localId, { tipoDescuento: event.target.value })}>
                                {!discountOptions.includes(row.form.tipoDescuento as typeof discountOptions[number]) &&
                                  <option value="">Tipo histórico: {row.form.tipoDescuento}</option>}
                                {discountOptions.map((option) => <option key={option} value={option}>
                                  {option === "NO_APLICA" ? "No aplica" : option === "ANTICIPO" ? "Anticipo" : option}
                                </option>)}
                              </select>
                            </label>
                          );
                          if (key === "observacion") return (
                            <label className={styles.field} key={key}>
                              <span>{label}</span>
                              <select required={row.estado === "OBSERVADO" && !historicalUnchanged}
                                value={observationOptions.includes(row.form.observacion as typeof observationOptions[number])
                                  ? row.form.observacion : ""}
                                onChange={(event) => updateRow(row.localId, { observacion: event.target.value })}>
                                <option value="">Sin observación</option>
                                {observationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                              {row.form.observacion && !observationOptions.includes(row.form.observacion as typeof observationOptions[number]) &&
                                <small>Observación histórica: {row.form.observacion}</small>}
                            </label>
                          );
                          const calculated = key === "subTotal" || key === "totalPostDescuento" || key === "totalPostDetraccion";
                          return (
                            <label className={styles.field} key={key}>
                              <span>{key === "subTotal" ? `${label} (kg)` : label}</span>
                              <input
                                required={key !== "nroLiquidacion" && !(key === "montoDescuento" && row.form.tipoDescuento === "NO_APLICA")}
                                readOnly={calculated || (key === "montoDescuento" && row.form.tipoDescuento === "NO_APLICA")}
                                type={type ?? "text"}
                                min={key === "porcentajePeso" ? historicalUnchanged ? 0 : 0.01 : key === "cantidadJabas" ? historicalUnchanged ? 0 : 1 :
                                  key === "precioJaba" || key === "precioKilo" || key === "montoDescuento" || key === "detraccion" ? 0 : undefined}
                                max={key === "porcentajePeso" ? 100 : key === "cantidadJabas" && !historicalUnchanged ? receivedCrates : undefined}
                                step={key === "precioJaba" || key === "precioKilo" ? "any" :
                                  type === "number" && key !== "cantidadJabas" ? "0.01" : undefined}
                                value={calculated ? amounts[key] : row.form[key] ?? ""}
                                onChange={(event) => updateRow(row.localId, {
                                  [key]: event.target.value
                                } as Partial<DetailDraft>)}
                              />
                            </label>
                          );
                        })}
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
            Revisa el saldo de jabas y los importes calculados antes de guardar.
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
      <ProductorFormModal open={producerModalOpen} session={session}
        onClose={() => setProducerModalOpen(false)} onSaved={async (created) => {
          if (!session) return;
          let catalogRefreshFailed = false;
          try {
            setCatalogs(await pagosService.catalogs(session));
          } catch {
            catalogRefreshFailed = true;
            setCatalogs((current) => current ? {
              ...current,
              productores: [...current.productores, {
                id: created.publicId,
                nombre: [created.firstName, created.lastName].filter(Boolean).join(" "),
                activo: created.isActive
              }]
            } : current);
          }
          setHeader((current) => ({ ...current, productorId: created.publicId }));
          setRows((current) => current.map((row) => ({ ...row,
            form: { ...row.form, acreedorId: "", nroDocumentoProductor: "" } })));
          setProducerModalOpen(false);
          setNotice(catalogRefreshFailed
            ? "Productor creado y seleccionado. No se pudo actualizar la lista; vuelve a cargarla antes de vincular Systrace."
            : "Productor creado y seleccionado. Si usas Systrace, vincula su código de origen.");
        }} />
      <AcreedorCosechaFormModal open={creditorModalOpen} session={session} catalogs={catalogs}
        producerId={header.productorId} onClose={() => setCreditorModalOpen(false)}
        onSaved={async (saved) => {
          setCreditorModalOpen(false);
          if (saved.estadoAprobacion === "APPROVED") {
            setCreditorRevision((value) => value + 1);
            setRows((current) => current.map((row) => row.localId === creditorTargetRow ? {
              ...row, form: { ...row.form, acreedorId: saved.id,
                tipoDocumentoProductor: saved.tipoDocumento,
                nroDocumentoProductor: saved.nroDocumento }
            } : row));
            setNotice("Acreedor seleccionado en el detalle.");
          } else {
            setPendingCreditor(saved);
            setNotice("Acreedor guardado. Apruébalo aquí para usarlo en el pago.");
          }
        }} />
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
      precioBase: "JABA",
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
      observacion: item.observacion,
      fechaPago: item.fechaPago
    }
  };
}
