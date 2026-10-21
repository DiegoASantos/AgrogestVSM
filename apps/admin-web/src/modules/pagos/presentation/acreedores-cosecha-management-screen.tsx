"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAdminOrAnalystSession } from "../../auth/utils/authorization";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import type { AcreedorCosecha, PagoCatalogs } from "../types/pagos.types";
import { AcreedorCosechaFormModal } from "./acreedor-cosecha-form-modal";
import { PhotoGallery } from "../../../shared/components/photo-gallery";
import type { GalleryPhoto } from "../../../shared/utils/photo-resource-cache";
import type { AuthSession } from "../../auth/types/auth.types";
import { fotosComercialesService } from "../services/fotos-comerciales.service";
import styles from "./pagos.module.css";

const statusLabels = {
  INCOMPLETE: "Falta banco y cuenta", PENDING: "Pendiente de aprobación", APPROVED: "Aprobado", OBSERVED: "Observado"
};

export function AcreedoresCosechaManagementScreen() {
  const { session } = useAuthSession();
  const [catalogs, setCatalogs] = useState<PagoCatalogs | null>(null);
  const [items, setItems] = useState<AcreedorCosecha[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AcreedorCosecha | null>(null);
  const [photoCreditor, setPhotoCreditor] = useState<AcreedorCosecha | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [lookups, result] = await Promise.all([
        pagosService.catalogs(session), pagosService.listCreditors(session, page, 50, search)
      ]);
      setCatalogs(lookups);
      setItems(result.items);
      setTotal(result.total);
      setError("");
    } catch {
      setError("No se pudo cargar el catálogo de acreedores.");
    }
  }, [session, page, search]);
  useEffect(() => { void load(); }, [load]);

  async function review(item: AcreedorCosecha, decision: "APPROVED" | "OBSERVED") {
    if (!session || busy) return;
    if (decision === "OBSERVED" && !observation.trim()) {
      setError("Escribe una observación antes de enviarla.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      await pagosService.reviewCreditor(session, item.id, decision,
        decision === "OBSERVED" ? observation.trim() : undefined);
      setReviewingId(null); setObservation("");
      setMessage(decision === "APPROVED" ? "Acreedor aprobado." : "Observación registrada.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo revisar el acreedor.");
    } finally { setBusy(false); }
  }

  async function remove(item: AcreedorCosecha) {
    if (!session || !window.confirm(`¿Eliminar el perfil de ${item.nombres} ${item.apellidos}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await pagosService.removeCreditor(session, item.id);
      setMessage("Acreedor eliminado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el acreedor.");
    } finally { setBusy(false); }
  }

  return <section className={styles.screen}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Mantenimiento · Comercial</span>
        <h1>Acreedores de cosecha</h1>
        <p>Administra y revisa los perfiles de acreedores.</p></div>
      <button className={styles.primary} type="button" onClick={() => { setEditing(null); setIsOpen(true); }}>
        Nuevo acreedor
      </button>
      {isAdminOrAnalystSession(session) ? <Link className={styles.secondary} href="/mantenimiento/acreedores-cosecha/fotos">Fotos por productor</Link> : null}
    </header>
    {message && <p className={styles.success} role="status">{message}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.sectionHeading}>
      <label className={styles.field} style={{ width: "min(100%, 390px)", margin: 0 }}>
        <span>Buscar por acreedor o productor</span>
        <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Nombre" />
      </label>
      <button className={styles.secondary} type="button" onClick={() => void load()}>Actualizar</button>
    </div>
    {items.length === 0 ? <div className={styles.empty}><strong>No hay acreedores</strong></div> :
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>Acreedor</th><th>Productor</th><th>Documento</th><th>Banco y cuenta</th>
          <th>Estado</th><th>Origen</th><th>Acciones</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td>{item.nombres} {item.apellidos}</td>
          <td>{item.productorNombre}</td>
          <td>{item.tipoDocumento} {item.nroDocumento}</td>
          <td>{item.banco ?? "Sin banco"}<small>{item.nroCuenta ?? "Sin cuenta"}</small></td>
          <td><span className={`${styles.status} ${item.estadoAprobacion === "APPROVED"
            ? styles.statusPAGADO : item.estadoAprobacion === "OBSERVED"
              ? styles.statusOBSERVADO : styles.statusPENDIENTE}`}>
            {statusLabels[item.estadoAprobacion]}</span></td>
          <td>{item.origen}</td>
          <td className={styles.actions}>
            <button type="button" onClick={() => { setEditing(item); setIsOpen(true); }}>
              {item.estadoAprobacion === "INCOMPLETE" ? "Completar cuenta" : "Editar"}
            </button>
            {isAdminOrAnalystSession(session) ? <button type="button" onClick={() => setPhotoCreditor(item)}>Ver fotos</button> : null}
            {item.estadoAprobacion === "PENDING" && <button type="button" disabled={busy}
              onClick={() => void review(item, "APPROVED")}>Aprobar</button>}
            {item.estadoAprobacion !== "OBSERVED" && item.estadoAprobacion !== "INCOMPLETE" && <button type="button" disabled={busy}
              onClick={() => { setReviewingId(item.id); setObservation(""); }}>Observar</button>}
            <button type="button" disabled={busy} onClick={() => void remove(item)}>Eliminar</button>
            {reviewingId === item.id && <div>
              <textarea aria-label="Observación del acreedor" maxLength={1000}
                value={observation} onChange={(event) => setObservation(event.target.value)} />
              <button type="button" disabled={busy || !observation.trim()}
                onClick={() => void review(item, "OBSERVED")}>Enviar observación</button>
              <button type="button" onClick={() => setReviewingId(null)}>Cancelar</button>
            </div>}
          </td>
        </tr>)}</tbody>
      </table></div>}
    {photoCreditor && session ? <CreditorPhotos key={photoCreditor.id} session={session}
      creditor={photoCreditor} onClose={() => setPhotoCreditor(null)} /> : null}
    <div className={styles.pagination}>
      <button disabled={page <= 1} type="button" onClick={() => setPage((value) => value - 1)}>Anterior</button>
      <span>{total} perfiles · Página {page} de {Math.max(1, Math.ceil(total / 50))}</span>
      <button disabled={page >= Math.max(1, Math.ceil(total / 50))} type="button"
        onClick={() => setPage((value) => value + 1)}>Siguiente</button>
    </div>
    <AcreedorCosechaFormModal open={isOpen} session={session} catalogs={catalogs}
      initial={editing} onClose={() => setIsOpen(false)} onSaved={async () => {
        setIsOpen(false);
        setMessage(editing ? "Acreedor actualizado. Revisa su aprobación." : "Acreedor creado. Apruébalo para usarlo en pagos.");
        await load();
      }} />
  </section>;
}

function CreditorPhotos({ session, creditor, onClose }: {
  session: AuthSession;
  creditor: AcreedorCosecha;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void fotosComercialesService.listCreditorPhotos(session, creditor.id, page).then((result) => {
      if (active) { setPhotos(result.items); setTotal(result.total); }
    }, () => {
      if (active) { setPhotos([]); setError("No se pudieron cargar las fotos del acreedor."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, creditor.id, page, attempt]);
  const loadPhoto = useCallback((photo: GalleryPhoto) =>
    fotosComercialesService.viewCreditorPhoto(session, creditor.id, photo.id),
    [session, creditor.id]);
  return <PhotoGallery title={`Fotos de ${creditor.nombres} ${creditor.apellidos}`}
    photos={photos} total={total} page={page} loading={loading} error={error}
    loadPhoto={loadPhoto} onPageChange={setPage} onRetry={() => setAttempt((value) => value + 1)}
    onClose={onClose} />;
}
