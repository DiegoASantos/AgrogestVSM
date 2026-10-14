"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { isAdminOrAnalystSession } from "../../auth/utils/authorization";
import {
  duplicadosProductoresService,
  type DuplicateCase,
  type DuplicatePreview
} from "../services/duplicados-productores.service";

const RELATION_LABELS: Record<string, string> = {
  visitas_campo: "visitas",
  pagos_cosecha: "pagos de cosecha",
  acreedores_cosecha: "acreedores",
  registros_cosecha: "registros de cosecha",
  invitaciones_acreedor_productor: "enlaces comerciales",
  pago_productores: "pagos a productores",
  fotos_comerciales_productor: "fotos comerciales"
};

export function DuplicadosProductoresScreen() {
  const { session } = useAuthSession();
  const [cases, setCases] = useState<DuplicateCase[]>([]);
  const [preview, setPreview] = useState<DuplicatePreview | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedParcels, setSelectedParcels] = useState<Record<string, string>>({});
  const [selectedCreditors, setSelectedCreditors] = useState<string[]>([]);
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session || !isAdminOrAnalystSession(session)) return;
    try { setCases(await duplicadosProductoresService.list(session)); }
    catch { setError("No se pudieron cargar los casos."); }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      setMessage(success);
      setPreview(null);
      setSelectedCase(null);
      setSelectedParcels({});
      setSelectedCreditors([]);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar la operación.");
    } finally { setBusy(false); }
  }

  if (!session || !isAdminOrAnalystSession(session)) {
    return <section className="panel"><h1>Productores duplicados</h1><p>Acceso solo para ADMIN y ANALISTA.</p></section>;
  }

  return <section className="panel-grid">
    <article className="panel">
      <p className="eyebrow">Mantenimiento · Productores</p>
      <h1 className="title title--section">Posibles productores duplicados</h1>
      <p className="body-copy">Revisa las fichas antes de elegir una principal. La unificación conserva visitas, parcelas y datos comerciales. Los conflictos deben resolverse primero.</p>
      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void run(() => duplicadosProductoresService.scan(session), "Revisión de fichas existentes terminada.")}>Buscar coincidencias existentes</button>
        <Link href="/mantenimiento/productores">Ver productores</Link>
      </div>
      <div className="actions">
        <label>Primer ID <input value={firstId} onChange={(event) => setFirstId(event.target.value)} inputMode="numeric" /></label>
        <label>Segundo ID <input value={secondId} onChange={(event) => setSecondId(event.target.value)} inputMode="numeric" /></label>
        <button type="button" disabled={busy || !firstId || !secondId} onClick={() => void run(
          () => duplicadosProductoresService.propose(session, firstId, secondId), "Par enviado a revisión."
        )}>Proponer par manualmente</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </article>
    <article className="panel">
      <h2 className="title title--section">Casos pendientes ({cases.length})</h2>
      {cases.length === 0 && <p>No hay candidatos pendientes.</p>}
      <ul className="feature-list">
        {cases.map((item) => <li className="feature-item" key={item.id}>
          <strong>{item.lesserName} / {item.greaterName}</strong>
          <span>IDs {item.lesserId} y {item.greaterId}. Motivos: {item.reasons.join(", ")}.</span>
          <div className="actions">
            <button type="button" disabled={busy} onClick={() => void showPreview(item.id, item.lesserId)}>Conservar {item.lesserName}</button>
            <button type="button" disabled={busy} onClick={() => void showPreview(item.id, item.greaterId)}>Conservar {item.greaterName}</button>
            <button type="button" disabled={busy} onClick={() => void run(() => duplicadosProductoresService.dismiss(session, item.id), "Caso descartado.")}>No son la misma persona</button>
          </div>
        </li>)}
      </ul>
    </article>
    {preview && selectedCase && <article className="panel">
      <h2 className="title title--section">Vista previa de unificación</h2>
      <p>Principal: {preview.principal.firstName} {preview.principal.lastName} (ID {preview.principal.id}). Secundaria: {preview.secondary.firstName} {preview.secondary.lastName} (ID {preview.secondary.id}).</p>
      <p>Parcelas de la ficha secundaria: {preview.sourceParcels.length}. Registros: {Object.entries(preview.relations).map(([name, count]) => `${RELATION_LABELS[name] ?? name}: ${count}`).join(" · ")}.</p>
      {(preview.relations.invitaciones_acreedor_productor ?? 0) > 0 && <p>Los enlaces comerciales de la ficha secundaria se revocarán. Emite uno nuevo desde la ficha principal si hace falta.</p>}
      {preview.conflicts.map((conflict) => <p role="alert" key={conflict}>{conflict}</p>)}
      {[...new Set(preview.possibleSameParcels.map((pair) => pair.sourceParcelId))].map((sourceId) => <label key={sourceId} style={{ display: "block" }}>
        Parcela ID {sourceId}: confirma la parcela principal a la que se trasladarán sus visitas.
        <select value={selectedParcels[sourceId] ?? ""} onChange={(event) => setSelectedParcels((previous) =>
          ({ ...previous, [sourceId]: event.target.value }))}>
          <option value="">Seleccionar parcela principal</option>
          {preview.possibleSameParcels.filter((pair) => pair.sourceParcelId === sourceId).map((pair) =>
            <option key={pair.targetParcelId} value={pair.targetParcelId}>{pair.name} · ID {pair.targetParcelId}</option>)}
        </select>
      </label>)}
      {preview.possibleSameCreditors.map((pair) => <label key={pair.sourceCreditorId} style={{ display: "block" }}>
        <input type="checkbox" checked={selectedCreditors.includes(pair.sourceCreditorId)} onChange={(event) => setSelectedCreditors((previous) =>
          event.target.checked ? [...previous, pair.sourceCreditorId] : previous.filter((id) => id !== pair.sourceCreditorId)
        )} />
        Confirmo que el acreedor ID {pair.sourceCreditorId} corresponde al acreedor ID {pair.targetCreditorId} ({pair.bank}, cuenta terminada en {pair.accountLast4}). Sus registros se asociarán al principal.
      </label>)}
      <div className="actions">
        <button type="button" disabled={busy || preview.conflicts.length > 0 ||
          Object.keys(selectedParcels).length !== new Set(preview.possibleSameParcels.map((pair) => pair.sourceParcelId)).size ||
          selectedCreditors.length !== preview.possibleSameCreditors.length}
          onClick={() => {
            if (!window.confirm("¿Confirmas la unificación de estas dos fichas?")) return;
            void run(() => duplicadosProductoresService.merge(session, selectedCase, preview,
              Object.entries(selectedParcels).map(([sourceParcelId, targetParcelId]) => ({ sourceParcelId, targetParcelId })),
              preview.possibleSameCreditors.filter((pair) => selectedCreditors.includes(pair.sourceCreditorId))
            ), "Productores unificados.");
          }}>Unificar fichas</button>
        <button type="button" onClick={() => { setPreview(null); setSelectedCase(null); }}>Cancelar</button>
      </div>
    </article>}
  </section>;

  async function showPreview(caseId: string, principalId: string) {
    setBusy(true); setError(""); setSelectedParcels({}); setSelectedCreditors([]);
    try {
      setPreview(await duplicadosProductoresService.preview(session!, caseId, principalId));
      setSelectedCase(caseId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la vista previa.");
    } finally { setBusy(false); }
  }
}
