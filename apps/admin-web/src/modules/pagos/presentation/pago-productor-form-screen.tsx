"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import type {
  AcreedorPago,
  AcreedorPagoPayload,
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
type CreditorDraft = AcreedorPagoPayload;

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
  const [creditorQueries, setCreditorQueries] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [creditorOpen, setCreditorOpen] = useState(false);
  const [creditorDraft, setCreditorDraft] = useState<CreditorDraft>({
    nombres: "",
    apellidos: "",
    tipoDocumento: "DNI",
    nroDocumento: "",
    banco: "BCP",
    nroCuenta: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      const [full, approved] = await Promise.all([
        pagosService.get(session, paymentId),
        pagosService.approvedCreditors(session, paymentId)
      ]);
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
      setCreditors(approved);
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

  async function saveHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = { ...header, jabas: Number(header.jabas) } as PagoProductorPayload;
      const saved = paymentId
        ? await pagosService.update(session, paymentId, { ...payload, estado: status })
        : await pagosService.create(session, payload);
      setPayment(saved);
      setNotice("Cabecera guardada. Ahora puedes registrar los detalles.");
      if (!paymentId) router.replace(`/pagos/productores/${saved.id}/editar`);
      else await load();
    } catch {
      setError("No se pudo guardar la cabecera. Revisa los campos e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  async function saveRows() {
    if (!session || !paymentId) {
      setError("Guarda primero la cabecera del pago.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const mapPayload = (form: DetailDraft): DetallePagoProductorPayload => ({
        ...form,
        cantidadJabas: Number(form.cantidadJabas),
        nroLiquidacion: form.nroLiquidacion || null
      });
      const created = rows.filter((row) => !row.id).map((row) => mapPayload(row.form));
      const updated = rows
        .filter((row) => row.id)
        .map((row) => ({
          id: row.id!,
          ...mapPayload(row.form),
          ...(row.estado ? { estado: row.estado } : {})
        }));
      await pagosService.saveDetailsBatch(session, paymentId, {
        crear: created,
        actualizar: updated,
        anularIds: removedIds
      });
      setRemovedIds([]);
      setNotice(
        "Detalles guardados. Los importes se conservaron como fueron ingresados."
      );
      await load();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los detalles. Revisa acreedores, supervisores y datos requeridos."
      );
    } finally {
      setBusy(false);
    }
  }
  async function createCreditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !paymentId) return;
    setBusy(true);
    setError("");
    try {
      const creditor = await pagosService.createApprovedCreditor(
        session,
        paymentId,
        creditorDraft
      );
      setCreditors((current) => [...current, creditor]);
      const lastRow = rows[rows.length - 1];
      if (lastRow && !lastRow.form.acreedorId)
        updateRow(lastRow.localId, {
          acreedorId: creditor.id,
          tipoDocumentoProductor: creditor.tipoDocumento,
          nroDocumentoProductor: creditor.nroDocumento
        });
      else
        setRows((current) => [
          ...current,
          {
            localId: newId(),
            form: {
              ...blankDetail,
              acreedorId: creditor.id,
              tipoDocumentoProductor: creditor.tipoDocumento,
              nroDocumentoProductor: creditor.nroDocumento,
              supervisorId: catalogs?.supervisores[0]?.id ?? ""
            }
          }
        ]);
      setCreditorOpen(false);
      setCreditorDraft({
        nombres: "",
        apellidos: "",
        tipoDocumento: "DNI",
        nroDocumento: "",
        banco: "BCP",
        nroCuenta: ""
      });
    } catch {
      setError(
        "No se pudo registrar al acreedor. Verifica si ya existe con el mismo documento, banco y cuenta."
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
          <p>Guarda la cabecera y agrega los acreedores en la sección de detalles.</p>
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
      <details className={styles.formSection} open>
        <summary>
          <span>
            <strong>1. Cabecera del pago</strong>
            <small>Productor y datos de recepción de la cosecha</small>
          </span>
          <span>{payment ? "Guardado" : "Pendiente"}</span>
        </summary>
        <form onSubmit={saveHeader} className={styles.sectionBody}>
          <label className={styles.field}>
            <span>Productor</span>
            <select
              required
              value={header.productorId}
              disabled={Boolean(paymentId && (payment?.detalles?.length ?? 0) > 0)}
              onChange={(event) =>
                setHeader((current) => ({ ...current, productorId: event.target.value }))
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
            {headerFields.map((item) => field(item.key, item.label, item.type))}
          </div>
          {paymentId && (
            <label className={styles.field}>
              <span>Estado del pago</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PagoProductorStatus)}
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.modalActions}>
            <button className={styles.primary} type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar cabecera"}
            </button>
          </div>
        </form>
      </details>
      <details className={styles.formSection} open={Boolean(paymentId)}>
        <summary>
          <span>
            <strong>2. Detalles por acreedor</strong>
            <small>
              {producer || "Primero guarda la cabecera"} · {rows.length}{" "}
              {rows.length === 1 ? "detalle" : "detalles"}
            </small>
          </span>
          <span>{rows.length ? `${rows.length} registros` : "Sin detalles"}</span>
        </summary>
        <div className={styles.sectionBody}>
          {!paymentId ? (
            <div className={styles.helper}>
              Guarda la cabecera para habilitar los acreedores aprobados de este
              productor.
            </div>
          ) : (
            <>
              {creditors.length === 0 && (
                <div className={styles.helper}>
                  Este productor aún no tiene acreedores aprobados. Puedes registrar uno
                  aquí y quedará aprobado para seleccionarlo.
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
                      <div className={styles.detailTopGrid}>
                        <label className={styles.field}>
                          <span>Buscar acreedor por nombre o documento</span>
                          <input
                            type="search"
                            value={creditorQueries[row.localId] ?? ""}
                            onChange={(event) =>
                              setCreditorQueries((current) => ({
                                ...current,
                                [row.localId]: event.target.value
                              }))
                            }
                            placeholder="Escribe nombre o número de documento"
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Acreedor aprobado</span>
                          <select
                            required
                            value={row.form.acreedorId}
                            onChange={(event) => {
                              const creditor = chosenCreditor(event.target.value);
                              updateRow(row.localId, {
                                acreedorId: event.target.value,
                                tipoDocumentoProductor: creditor?.tipoDocumento ?? "DNI",
                                nroDocumentoProductor: creditor?.nroDocumento ?? ""
                              });
                            }}
                          >
                            <option value="">Selecciona un acreedor</option>
                            {creditors
                              .filter(
                                (item) =>
                                  item.id === row.form.acreedorId ||
                                  `${item.nombre} ${item.tipoDocumento} ${item.nroDocumento}`
                                    .toLocaleLowerCase()
                                    .includes(
                                      (
                                        creditorQueries[row.localId] ?? ""
                                      ).toLocaleLowerCase()
                                    )
                              )
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.nombre} · {item.tipoDocumento} {item.nroDocumento}
                                </option>
                              ))}
                          </select>
                        </label>
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
                      <div className={styles.formGrid}>
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
                  + Añadir otro acreedor
                </button>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => setCreditorOpen(true)}
                >
                  + Registrar acreedor
                </button>
              </div>
              <div className={styles.stickySave}>
                <span>Los montos son manuales y no se calculan automáticamente.</span>
                <button
                  className={styles.primary}
                  type="button"
                  disabled={busy}
                  onClick={() => void saveRows()}
                >
                  {busy ? "Guardando…" : "Guardar todos los detalles"}
                </button>
              </div>
            </>
          )}
        </div>
      </details>
      {creditorOpen && (
        <div className={styles.backdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="creditor-title"
          >
            <div className={styles.modalHeading}>
              <div>
                <h2 id="creditor-title">Registrar acreedor</h2>
                <p>Se asociará a {producer} y quedará aprobado para este pago.</p>
              </div>
              <button
                className={styles.close}
                type="button"
                onClick={() => setCreditorOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form onSubmit={createCreditor}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Nombres</span>
                  <input
                    required
                    maxLength={100}
                    value={creditorDraft.nombres}
                    onChange={(event) =>
                      setCreditorDraft((draft) => ({
                        ...draft,
                        nombres: event.target.value
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Apellidos</span>
                  <input
                    required
                    maxLength={100}
                    value={creditorDraft.apellidos}
                    onChange={(event) =>
                      setCreditorDraft((draft) => ({
                        ...draft,
                        apellidos: event.target.value
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Tipo de documento</span>
                  <select
                    value={creditorDraft.tipoDocumento}
                    onChange={(event) =>
                      setCreditorDraft((draft) => ({
                        ...draft,
                        tipoDocumento: event.target
                          .value as CreditorDraft["tipoDocumento"]
                      }))
                    }
                  >
                    <option>DNI</option>
                    <option>RUC</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Número de documento</span>
                  <input
                    required
                    inputMode="numeric"
                    pattern={
                      creditorDraft.tipoDocumento === "DNI" ? "[0-9]{8}" : "[0-9]{11}"
                    }
                    value={creditorDraft.nroDocumento}
                    onChange={(event) =>
                      setCreditorDraft((draft) => ({
                        ...draft,
                        nroDocumento: event.target.value
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Banco</span>
                  <select
                    value={creditorDraft.banco}
                    onChange={(event) =>
                      setCreditorDraft((draft) => ({
                        ...draft,
                        banco: event.target.value as CreditorDraft["banco"]
                      }))
                    }
                  >
                    <option value="BCP">BCP</option>
                    <option value="INTERBANK">Interbank</option>
                    <option value="BBVA">BBVA</option>
                    <option value="CAJA_PIURA">Caja Piura</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Número de cuenta</span>
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{1,30}"
                    value={creditorDraft.nroCuenta}
                    onChange={(event) =>
                      setCreditorDraft((draft) => ({
                        ...draft,
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
                  onClick={() => setCreditorOpen(false)}
                >
                  Cancelar
                </button>
                <button className={styles.primary} disabled={busy} type="submit">
                  {busy ? "Registrando…" : "Crear y aprobar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
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
