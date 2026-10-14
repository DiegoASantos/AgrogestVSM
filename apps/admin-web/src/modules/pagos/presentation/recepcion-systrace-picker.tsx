"use client";

import { useRef, useState } from "react";
import { SearchableSelect } from "../../../shared/components/searchable-select";
import type { AuthSession } from "../../auth/types/auth.types";
import { pagosService } from "../services/pagos.service";
import type {
  BusquedaRecepcionesSystrace,
  PagoCatalogs,
  ProductorSystrace,
  RecepcionSystrace
} from "../types/pagos.types";
import styles from "./pagos.module.css";

type Props = {
  session: AuthSession;
  catalogs: PagoCatalogs;
  onApply: (reception: RecepcionSystrace, producerId: string) => void;
};

export function RecepcionSystracePicker({ session, catalogs, onApply }: Props) {
  const requestId = useRef(0);
  const [date, setDate] = useState("");
  const [searchedDate, setSearchedDate] = useState("");
  const [producers, setProducers] = useState<ProductorSystrace[]>([]);
  const [sourceCode, setSourceCode] = useState("");
  const [result, setResult] = useState<BusquedaRecepcionesSystrace | null>(null);
  const [pending, setPending] = useState<RecepcionSystrace | null>(null);
  const [linkProducerId, setLinkProducerId] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const source = producers.find((item) => item.codigo === sourceCode);

  async function searchDate() {
    if (!date) return;
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    setNotice("");
    setSourceCode("");
    setResult(null);
    setPending(null);
    setCorrecting(false);
    try {
      const response = await pagosService.searchRecepcionesSystrace(session, date);
      if (id !== requestId.current) return;
      setProducers(response.productores);
      setSearchedDate(date);
      if (response.productores.length === 0) setNotice("No hay recepciones para esta fecha.");
    } catch (cause) {
      if (id !== requestId.current) return;
      setProducers([]);
      setSearchedDate("");
      setError(cause instanceof Error ? cause.message : "No se pudieron consultar las recepciones.");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  async function selectProducer(code: string) {
    const id = ++requestId.current;
    setSourceCode(code);
    setPending(null);
    setCorrecting(false);
    setLinkProducerId("");
    setResult(null);
    setError("");
    setNotice("");
    if (!code) return;
    setBusy(true);
    try {
      const response = await pagosService.searchRecepcionesSystrace(session, searchedDate, code);
      if (id === requestId.current) setResult(response);
    } catch (cause) {
      if (id === requestId.current) {
        setError(cause instanceof Error ? cause.message : "No se pudieron consultar las recepciones.");
      }
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  async function loadPage(page: number) {
    if (!sourceCode) return;
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    try {
      const response = await pagosService.searchRecepcionesSystrace(session, searchedDate, sourceCode, page);
      if (id === requestId.current) setResult(response);
    } catch (cause) {
      if (id === requestId.current) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar la página.");
      }
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  function choose(reception: RecepcionSystrace) {
    if (!reception.cabecera || !source) return;
    setPending(reception);
    if (source.productorId && !correcting) {
      if (source.productorActivo === false && !window.confirm(
        "El productor vinculado está inactivo en AgroGest. ¿Quieres usarlo en esta cabecera?"
      )) return;
      onApply(reception, source.productorId);
      setNotice(`Recepción ${reception.nroGuia} precargada. Revisa la cabecera antes de guardar.`);
    } else {
      setNotice("Vincula este productor con AgroGest para aplicar la recepción.");
    }
  }

  async function link() {
    if (!source || !linkProducerId) return;
    const selectedInternal = catalogs.productores.find((item) => item.id === linkProducerId);
    if (selectedInternal?.activo === false && !window.confirm(
      "El productor de AgroGest está inactivo. ¿Confirmas este vínculo?"
    )) return;
    setBusy(true);
    setError("");
    try {
      const linked = await pagosService.linkProductorSystrace(session, {
        codigoProductor: source.codigo,
        productorId: linkProducerId,
        confirmarCorreccion: correcting,
        confirmarInactivo: selectedInternal?.activo === false
      });
      setProducers((current) => current.map((item) => item.codigo === source.codigo ? linked : item));
      setCorrecting(false);
      setNotice("Vínculo guardado. Se recordará para las siguientes recepciones.");
      if (pending && linked.productorId) onApply(pending, linked.productorId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el vínculo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.systracePicker}>
      <div>
        <strong>Precargar desde Systrace</strong>
        <p>Busca por fecha y productor, elige una recepción y revisa los datos antes de guardar.</p>
      </div>
      <div className={styles.systraceControls}>
        <label className={styles.field}>
          <span>Fecha de recepción</span>
          <input type="date" value={date} disabled={busy} onChange={(event) => {
            requestId.current += 1;
            setDate(event.target.value);
            setSearchedDate("");
            setProducers([]);
            setSourceCode("");
            setResult(null);
            setPending(null);
          }} />
        </label>
        <button className={styles.secondary} type="button" disabled={!date || busy} onClick={() => void searchDate()}>
          Buscar fecha
        </button>
      </div>
      {searchedDate && producers.length > 0 && (
        <SearchableSelect
          label="Productor de Systrace"
          value={sourceCode}
          options={producers.map((item) => ({ value: item.codigo, label: item.nombre, helper: item.codigo }))}
          placeholder="Busca por nombre o código"
          disabled={busy}
          onChange={(value) => void selectProducer(value)}
        />
      )}
      {source && (
        <div className={styles.systraceLink}>
          {source.productorId ? (
            <p>Vinculado con AgroGest: <strong>{source.productorNombre}</strong>{source.productorActivo ? "" : " · Inactivo"}</p>
          ) : (
            <p>Este productor aún no está vinculado con AgroGest.</p>
          )}
          {source.productorId && !correcting && (
            <button className={styles.secondary} type="button" onClick={() => {
              setCorrecting(true);
              setLinkProducerId("");
            }}>Corregir vínculo</button>
          )}
          {(!source.productorId || correcting) && (
            <div className={styles.systraceControls}>
              <label className={styles.field}>
                <span>Productor correspondiente en AgroGest</span>
                <select value={linkProducerId} onChange={(event) => setLinkProducerId(event.target.value)}>
                  <option value="">Selecciona un productor</option>
                  {catalogs.productores.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}{item.activo ? "" : " · Inactivo"}</option>
                  ))}
                </select>
              </label>
              <button className={styles.secondary} type="button" disabled={!linkProducerId || busy} onClick={() => void link()}>
                {correcting ? "Confirmar corrección" : "Vincular productor"}
              </button>
            </div>
          )}
        </div>
      )}
      {result && (
        <div className={styles.systraceResults}>
          <strong>{result.total} recepciones encontradas</strong>
          {result.recepciones.map((item, index) => (
            <div className={styles.systraceRow} key={`${item.nroGuia}-${item.lote}-${index}`}>
              <div>
                <strong>Guía {item.nroGuia} · Lote {item.lote}</strong>
                <small>{item.cabecera ? `${item.cabecera.jabas} jabas · ${item.cabecera.pesoNeto} kg netos` : "Datos de origen incompletos"}</small>
                {item.pagoExistenteId && <small>Ya existe un pago con esta guía y lote.</small>}
              </div>
              <button className={styles.secondary} type="button" disabled={item.invalida || busy} onClick={() => choose(item)}>
                Usar recepción
              </button>
            </div>
          ))}
          {result.total > result.limit && (
            <div className={styles.pagination}>
              <button type="button" disabled={busy || result.page === 1} onClick={() => void loadPage(result.page - 1)}>Anterior</button>
              <span>Página {result.page} de {Math.ceil(result.total / result.limit)}</span>
              <button type="button" disabled={busy || result.page * result.limit >= result.total} onClick={() => void loadPage(result.page + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      )}
      {busy && <p role="status">Consultando Systrace...</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error} Puedes completar el pago manualmente.</p>}
    </div>
  );
}
