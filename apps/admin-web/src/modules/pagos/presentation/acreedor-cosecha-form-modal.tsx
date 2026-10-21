"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AuthSession } from "../../auth/types/auth.types";
import { pagosService } from "../services/pagos.service";
import { creditorSaveAction } from "../domain/acreedor-perfil";
import type { AcreedorCosecha, AcreedorCosechaPayload, PagoCatalogs } from "../types/pagos.types";
import styles from "./pagos.module.css";

type Form = AcreedorCosechaPayload;
const emptyForm: Form = {
  productorId: "", nombres: "", apellidos: "", tipoDocumento: "DNI",
  nroDocumento: "", banco: "BCP", nroCuenta: ""
};
const fieldsFrom = (item: AcreedorCosecha, productorId: string): Form => ({
  productorId, nombres: item.nombres, apellidos: item.apellidos,
  tipoDocumento: item.tipoDocumento, nroDocumento: item.nroDocumento,
  banco: item.banco ?? "BCP", nroCuenta: item.nroCuenta ?? ""
});

export function AcreedorCosechaFormModal({ open, session, catalogs, producerId, initial,
  onClose, onSaved }: {
  open: boolean;
  session: AuthSession | null;
  catalogs: PagoCatalogs | null;
  producerId?: string;
  initial?: AcreedorCosecha | null;
  onClose: () => void;
  onSaved: (item: AcreedorCosecha) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [matches, setMatches] = useState<AcreedorCosecha[]>([]);
  const [chosen, setChosen] = useState<AcreedorCosecha | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    requestId.current += 1;
    setForm(initial ? fieldsFrom(initial, producerId ?? initial.productorId) : {
      ...emptyForm, productorId: producerId ?? catalogs?.productores[0]?.id ?? ""
    });
    setChosen(initial ?? null);
    setMatches([]);
    setError("");
  }, [open, initial, producerId, catalogs]);

  useEffect(() => {
    if (!open || !session || initial) return;
    const expected = form.tipoDocumento === "DNI" ? 8 : 11;
    if (form.nroDocumento.length !== expected || !/^\d+$/.test(form.nroDocumento)) {
      setMatches([]);
      setSearching(false);
      return;
    }
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void pagosService.searchCreditorsByDocument(session, form.tipoDocumento, form.nroDocumento)
        .then((items) => {
          if (id !== requestId.current) return;
          setMatches(items);
          if (items.length === 1) {
            setChosen(items[0]);
            setForm((current) => fieldsFrom(items[0], current.productorId));
          }
        })
        .catch(() => {
          if (id === requestId.current) setError("No se pudo buscar el documento.");
        })
        .finally(() => {
          if (id === requestId.current) setSearching(false);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, session, initial, form.tipoDocumento, form.nroDocumento]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, productorId: producerId ?? form.productorId };
      const action = creditorSaveAction(payload, chosen);
      const saved = action === "select" ? chosen! : action === "update"
        ? await pagosService.updateCreditor(session, chosen!.id, payload)
        : await pagosService.createCreditor(session, payload);
      await onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el acreedor.");
    } finally {
      setBusy(false);
    }
  }

  const choose = (item: AcreedorCosecha) => {
    setChosen(item);
    setForm((current) => fieldsFrom(item, current.productorId));
    setMatches([]);
  };
  return <div className={styles.backdrop}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="creditor-form-title"
      style={{ width: "min(620px, 100%)" }}>
      <div className={styles.modalHeading}>
        <div><h2 id="creditor-form-title">{initial ? "Editar acreedor" : "Nuevo acreedor"}</h2>
          <p>Busca por documento para recuperar datos existentes. Revisa la cuenta antes de guardar.</p></div>
        <button className={styles.close} type="button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <form onSubmit={(event) => void submit(event)}>
        <label className={styles.field}><span>Productor</span>
          <select required value={form.productorId} disabled={Boolean(producerId)}
            onChange={(event) => setForm((current) => ({ ...current, productorId: event.target.value }))}>
            <option value="">Selecciona productor</option>
            {catalogs?.productores.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </label>
        <div className={styles.formGrid}>
          <label className={styles.field}><span>Tipo de documento</span>
            <select value={form.tipoDocumento} onChange={(event) => {
              requestId.current += 1; setChosen(null); setMatches([]);
              setForm((current) => ({ ...current, tipoDocumento: event.target.value as "DNI" | "RUC",
                nroDocumento: "", ...(chosen ? { nombres: "", apellidos: "", banco: "BCP" as const,
                  nroCuenta: "" } : {}) }));
            }}><option value="DNI">DNI</option><option value="RUC">RUC</option></select>
          </label>
          <label className={styles.field}><span>Número de documento</span>
            <input required inputMode="numeric" pattern="[0-9]+"
              minLength={form.tipoDocumento === "DNI" ? 8 : 11}
              maxLength={form.tipoDocumento === "DNI" ? 8 : 11}
              value={form.nroDocumento} onChange={(event) => {
                requestId.current += 1; setChosen(null); setMatches([]);
                setForm((current) => ({ ...current, nroDocumento: event.target.value.replace(/\D/g, ""),
                  ...(chosen ? { nombres: "", apellidos: "", banco: "BCP" as const,
                    nroCuenta: "" } : {}) }));
              }} />
          </label>
        </div>
        {searching && <p role="status">Buscando acreedores…</p>}
        {matches.length > 1 && <div className={styles.helper}>
          <strong>Elige el perfil que quieres usar como base:</strong>
          {matches.map((item) => <button className={styles.secondary} key={item.id} type="button"
            onClick={() => choose(item)}>
            {item.nombres} {item.apellidos} · {item.productorNombre} · {item.banco} ·
            cuenta terminada en {item.nroCuenta?.slice(-4) ?? "sin registrar"}
          </button>)}
        </div>}
        {chosen && <p className={styles.helper}>
          Datos precargados de {chosen.productorNombre}. Puedes editarlos.
          {chosen.productorId !== form.productorId && " Se creará un perfil para el productor seleccionado."}
        </p>}
        <div className={styles.formGrid}>
          <label className={styles.field}><span>Nombres</span>
            <input required maxLength={100} value={form.nombres}
              onChange={(event) => setForm((current) => ({ ...current, nombres: event.target.value }))} />
          </label>
          <label className={styles.field}><span>Apellidos</span>
            <input required maxLength={100} value={form.apellidos}
              onChange={(event) => setForm((current) => ({ ...current, apellidos: event.target.value }))} />
          </label>
          <label className={styles.field}><span>Banco</span>
            <select value={form.banco} onChange={(event) => setForm((current) => ({ ...current, banco: event.target.value as Form["banco"] }))}>
              <option value="BCP">BCP</option><option value="INTERBANK">Interbank</option>
              <option value="CAJA_PIURA">Caja Piura</option><option value="BBVA">BBVA</option>
            </select>
          </label>
          <label className={styles.field}><span>Número de cuenta o CCI</span>
            <input required inputMode="numeric" maxLength={30} pattern="[0-9]+"
              value={form.nroCuenta} onChange={(event) => setForm((current) =>
                ({ ...current, nroCuenta: event.target.value.replace(/\D/g, "") }))} />
          </label>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.modalActions}>
          <button className={styles.secondary} type="button" onClick={onClose}>Cancelar</button>
          <button className={styles.primary} type="submit" disabled={busy || searching || matches.length > 1}>
            {busy ? "Guardando…" : "Guardar acreedor"}
          </button>
        </div>
      </form>
    </section>
  </div>;
}
