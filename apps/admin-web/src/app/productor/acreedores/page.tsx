"use client";

import { useState, type FormEvent } from "react";
import { harvestCreditorSchema } from "@agrogest/validation";
import {
  exchangeProducerCode,
  listProducerCreditors,
  producerCreditorHistory,
  saveProducerCreditor,
  type PublicCreditor,
  type ProducerCreditorFields
} from "../../../modules/comercial/services/comercial.service";
import styles from "../../../modules/comercial/presentation/comercial.module.css";

const empty: ProducerCreditorFields = {
  creditorFirstName: "",
  creditorLastName: "",
  creditorDocumentType: "DNI",
  creditorDocumentNumber: "",
  bank: "BCP",
  accountNumber: ""
};
const statusLabel = {
  PENDING: "Pendiente de revisión",
  APPROVED: "Aprobado",
  OBSERVED: "Con observación"
};

export default function ProducerCreditorsPage() {
  const [code, setCode] = useState("");
  const [session, setSession] = useState("");
  const [producerName, setProducerName] = useState("");
  const [items, setItems] = useState<PublicCreditor[]>([]);
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [fields, setFields] = useState<ProducerCreditorFields>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const access = await exchangeProducerCode(code);
      const own = await listProducerCreditors(access.session);
      setSession(access.session);
      setProducerName(access.producerName);
      setItems(own);
      setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo ingresar.");
    } finally {
      setBusy(false);
    }
  }

  function setField<K extends keyof ProducerCreditorFields>(
    key: K,
    value: ProducerCreditorFields[K]
  ) {
    setFields((current) => ({ ...current, [key]: value }));
    setConfirm(false);
  }

  function startEdit(item: PublicCreditor) {
    setFields({
      creditorFirstName: item.creditorFirstName,
      creditorLastName: item.creditorLastName,
      creditorDocumentType: item.creditorDocumentType,
      creditorDocumentNumber: item.creditorDocumentNumber,
      bank: item.bank,
      accountNumber: item.accountNumber
    });
    setEditingId(item.id);
    setConfirm(false);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = harvestCreditorSchema.safeParse({
      ...fields,
      productorId: "autorizado"
    });
    if (!result.success) {
      setMessage(
        "Revisa los nombres, el documento y el número de cuenta o CCI. Usa solo dígitos en los números."
      );
      return;
    }
    setMessage("");
    setConfirm(true);
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await saveProducerCreditor(session, fields, editingId ?? undefined);
      setItems(await listProducerCreditors(session));
      setFields(empty);
      setEditingId(null);
      setConfirm(false);
      setMessage(
        "Datos enviados. El equipo Comercial los revisará antes de usarlos para una cosecha."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "No se pudo guardar.";
      setMessage(detail);
      if (detail.includes("sesión")) setSession("");
    } finally {
      setBusy(false);
    }
  }

  async function showHistory(id: string) {
    if (history[id]) {
      setHistory((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const entries = await producerCreditorHistory(session, id);
      setHistory((current) => ({
        ...current,
        [id]: entries.map(
          (entry) =>
            `${new Date(entry.createdAt).toLocaleDateString("es-PE")} · ${entry.decision === "APPROVED" ? "Aprobado" : `Observado: ${entry.observation ?? ""}`}`
        )
      }));
    } catch {
      setMessage("No se pudo consultar el historial.");
    }
  }

  return (
    <main className={styles.publicPage}>
      <div className={styles.publicShell}>
        <header className={styles.publicHeader}>
          <span className={styles.brand}>AgroGest VSM</span>
          <span className={styles.tag}>Datos de pago</span>
          <h1>Registra a quien recibirá el pago</h1>
          <p>
            Completa los datos bancarios del acreedor. Puedes registrar más de una
            persona. El equipo Comercial revisará cada perfil antes de usarlo.
          </p>
        </header>
        {message && (
          <p className={styles.message} role="status">
            {message}
          </p>
        )}
        {!session ? (
          <form
            className={styles.card}
            onSubmit={(event) => {
              void enter(event);
            }}
          >
            <span className={styles.step}>Paso 1 de 2 · Acceso</span>
            <h2>Ingresa tu código</h2>
            <p>Pide al agrónomo el código que acompaña este enlace.</p>
            <label htmlFor="access-code">Código de acceso</label>
            <input
              id="access-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="1234-5678"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              required
            />
            <button disabled={busy} type="submit">
              {busy ? "Verificando…" : "Continuar"}
            </button>
          </form>
        ) : (
          <>
            <div className={styles.identity}>
              Formulario de <strong>{producerName || "productor"}</strong>
              <button
                type="button"
                onClick={() => {
                  setSession("");
                  setItems([]);
                  setFields(empty);
                }}
              >
                Salir
              </button>
            </div>
            <form className={styles.card} onSubmit={validate}>
              <span className={styles.step}>Paso 2 de 2 · Acreedor</span>
              <h2>{editingId ? "Corrige los datos" : "Datos del acreedor"}</h2>
              <p>
                Revisa que el documento y la cuenta pertenezcan a la persona que recibirá
                el pago.
              </p>
              <div className={styles.grid}>
                <div>
                  <label htmlFor="first">Nombres</label>
                  <input
                    id="first"
                    autoComplete="given-name"
                    maxLength={100}
                    placeholder="Ej. María Elena"
                    required
                    value={fields.creditorFirstName}
                    onChange={(event) =>
                      setField("creditorFirstName", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor="last">Apellidos</label>
                  <input
                    id="last"
                    autoComplete="family-name"
                    maxLength={100}
                    placeholder="Ej. Pérez López"
                    required
                    value={fields.creditorLastName}
                    onChange={(event) => setField("creditorLastName", event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="type">Tipo de documento</label>
                  <select
                    id="type"
                    value={fields.creditorDocumentType}
                    onChange={(event) =>
                      setField(
                        "creditorDocumentType",
                        event.target.value as "DNI" | "RUC"
                      )
                    }
                  >
                    <option>DNI</option>
                    <option>RUC</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="number">Número de documento</label>
                  <input
                    id="number"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={fields.creditorDocumentType === "DNI" ? 8 : 11}
                    placeholder={
                      fields.creditorDocumentType === "DNI" ? "8 dígitos" : "11 dígitos"
                    }
                    required
                    value={fields.creditorDocumentNumber}
                    onChange={(event) =>
                      setField(
                        "creditorDocumentNumber",
                        event.target.value.replace(/\D/g, "")
                      )
                    }
                  />
                </div>
                <div>
                  <label htmlFor="bank">Banco</label>
                  <select
                    id="bank"
                    value={fields.bank}
                    onChange={(event) =>
                      setField(
                        "bank",
                        event.target.value as ProducerCreditorFields["bank"]
                      )
                    }
                  >
                    <option value="BCP">BCP</option>
                    <option value="INTERBANK">Interbank</option>
                    <option value="CAJA_PIURA">Caja Piura</option>
                    <option value="BBVA">BBVA</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="account">Número de cuenta o CCI</label>
                  <input
                    id="account"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={30}
                    placeholder="Solo números, hasta 30 dígitos"
                    required
                    value={fields.accountNumber}
                    onChange={(event) =>
                      setField("accountNumber", event.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
              </div>
              <button type="submit">Revisar datos antes de enviar</button>
              {editingId && (
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFields(empty);
                    setConfirm(false);
                  }}
                >
                  Cancelar corrección
                </button>
              )}
              {confirm && (
                <div
                  className={styles.confirm}
                  role="region"
                  aria-label="Confirma los datos"
                >
                  <strong>Confirma antes de enviar</strong>
                  <p>
                    {fields.creditorFirstName} {fields.creditorLastName} ·{" "}
                    {fields.creditorDocumentType} {fields.creditorDocumentNumber}
                    <br />
                    {fields.bank} · Cuenta/CCI {fields.accountNumber}
                  </p>
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => {
                      void save();
                    }}
                  >
                    {busy ? "Enviando…" : "Confirmar y enviar"}
                  </button>
                </div>
              )}
            </form>
            <section className={styles.card} aria-label="Perfiles registrados">
              <h2>Perfiles registrados</h2>
              <p>
                Vuelve a ingresar con tu código para consultar el estado de la revisión.
              </p>
              {items.length === 0 ? (
                <p>Aún no hay perfiles.</p>
              ) : (
                <div className={styles.list}>
                  {items.map((item) => (
                    <article className={styles.item} key={item.id}>
                      <div>
                        <strong>
                          {item.creditorFirstName} {item.creditorLastName}
                        </strong>
                        <span className={styles.status}>
                          {statusLabel[item.approvalStatus]}
                        </span>
                      </div>
                      <p>
                        {item.bank} · Cuenta/CCI terminada en{" "}
                        {item.accountNumber.slice(-4)}
                      </p>
                      {item.reviewObservation && (
                        <p className={styles.observation}>
                          <strong>Observación:</strong> {item.reviewObservation}
                        </p>
                      )}
                      <button
                        className={styles.secondary}
                        type="button"
                        onClick={() => {
                          void showHistory(item.id);
                        }}
                      >
                        {history[item.id]
                          ? "Ocultar historial"
                          : "Ver historial de revisión"}
                      </button>
                      {history[item.id] && (
                        <ul className={styles.history}>
                          {history[item.id].map((entry, index) => (
                            <li key={index}>{entry}</li>
                          ))}
                        </ul>
                      )}
                      {item.approvalStatus !== "PENDING" && (
                        <button
                          className={styles.secondary}
                          type="button"
                          onClick={() => startEdit(item)}
                        >
                          {item.approvalStatus === "OBSERVED"
                            ? "Corregir y reenviar"
                            : "Actualizar datos"}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
