"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import {
  fotosComercialesService,
  type FotoComercial,
  type ProductorConFotos
} from "../services/fotos-comerciales.service";
import styles from "./pagos.module.css";

export function FotosComercialesManagementScreen() {
  const { session } = useAuthSession();
  const [items, setItems] = useState<ProductorConFotos[]>([]);
  const [photos, setPhotos] = useState<FotoComercial[]>([]);
  const [selected, setSelected] = useState<ProductorConFotos | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [photoPage, setPhotoPage] = useState(1);
  const [photoTotal, setPhotoTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const photoRequest = useRef(0);
  const photoViewRequest = useRef(0);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const result = await fotosComercialesService.listProducers(session, page, search);
      setItems(result.items);
      setTotal(result.total);
      setError("");
    } catch {
      setError("No se pudo consultar la lista de productores con fotos.");
    }
  }, [session, page, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  useEffect(() => () => { photoRequest.current += 1; photoViewRequest.current += 1; }, []);
  useEffect(() => {
    if (session) return;
    photoRequest.current += 1;
    photoViewRequest.current += 1;
    setSelected(null);
    setPhotos([]);
    setPhotoUrl(null);
  }, [session]);

  async function selectProducer(producer: ProductorConFotos) {
    if (!session) return;
    closePhoto();
    setSelected(producer);
    setPhotos([]);
    setPhotoTotal(0);
    setPhotoPage(1);
    await loadPhotos(producer, 1);
  }

  async function loadPhotos(producer: ProductorConFotos, requestedPage: number) {
    if (!session) return;
    const requestId = ++photoRequest.current;
    try {
      const result = await fotosComercialesService.listPhotos(session, producer.productorId, requestedPage);
      if (requestId !== photoRequest.current) return;
      setPhotos(result.items);
      setPhotoTotal(result.total);
      setPhotoPage(requestedPage);
      setError("");
    } catch {
      if (requestId !== photoRequest.current) return;
      setPhotos([]);
      setPhotoTotal(0);
      setError("No se pudieron consultar las fotos del productor.");
    }
  }

  async function openPhoto(photo: FotoComercial) {
    if (!session) return;
    closePhoto();
    const requestId = ++photoViewRequest.current;
    try {
      const url = await fotosComercialesService.viewPhoto(session, photo.id);
      if (requestId !== photoViewRequest.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setPhotoUrl(url);
      setError("");
    } catch {
      setError("No se pudo abrir la foto.");
    }
  }

  function closePhoto() {
    photoViewRequest.current += 1;
    setPhotoUrl(null);
  }

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Mantenimiento · Comercial</span>
          <h1>Fotos por productor</h1>
          <p>Fotos enviadas por agrónomos para revisión visual. Esta vista no registra acreedores.</p>
        </div>
        <Link className={styles.secondary} href="/mantenimiento/acreedores-cosecha">
          Volver a acreedores
        </Link>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.sectionHeading}>
        <label className={styles.field}>
          <span>Buscar productor</span>
          <input
            value={search}
            onChange={(event) => { setPage(1); setSearch(event.target.value); }}
            placeholder="Nombre del productor"
          />
        </label>
      </div>
      {items.length === 0 ? (
        <div className={styles.empty}>No hay productores con fotos para mostrar.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Productor</th><th>Fotos</th><th>Última carga</th><th>Acción</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productorId}>
                  <td>{item.productorNombre}</td>
                  <td>{item.cantidadFotos}</td>
                  <td>{new Date(item.ultimaFotoAt).toLocaleDateString("es-PE")}</td>
                  <td>
                    <button type="button" onClick={() => { void selectProducer(item); }}>
                      Ver fotos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={styles.pagination}>
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page} de {Math.max(1, Math.ceil(total / 20))}</span>
        <button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>
      {selected && (
        <section>
          <h2>Fotos de {selected.productorNombre}</h2>
          {photos.length === 0 ? <p>No hay fotos disponibles.</p> : (
            <div className={styles.photoGrid}>
              {photos.map((photo, index) => (
                <button
                  className={styles.photoTile}
                  key={photo.id}
                  type="button"
                  onClick={() => { void openPhoto(photo); }}
                >
                  Foto {(photoPage - 1) * 20 + index + 1} · {new Date(photo.createdAt).toLocaleString("es-PE")}
                </button>
              ))}
            </div>
          )}
          {photoTotal > 20 && (
            <div className={styles.pagination}>
              <button type="button" disabled={photoPage <= 1} onClick={() => { void loadPhotos(selected, photoPage - 1); }}>Anterior</button>
              <span>Página {photoPage} de {Math.ceil(photoTotal / 20)}</span>
              <button type="button" disabled={photoPage >= Math.ceil(photoTotal / 20)} onClick={() => { void loadPhotos(selected, photoPage + 1); }}>Siguiente</button>
            </div>
          )}
        </section>
      )}
      {photoUrl && (
        <div className={styles.backdrop} role="presentation" onClick={closePhoto}>
          <div className={styles.photoViewer} role="dialog" aria-modal="true" aria-label="Foto del productor" onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.secondary} onClick={closePhoto}>Cerrar</button>
            {/* Blob URL generated from an authorized API response; it is revoked when closed. */}
            <img src={photoUrl} alt="Documento comercial del productor" />
          </div>
        </div>
      )}
    </section>
  );
}
