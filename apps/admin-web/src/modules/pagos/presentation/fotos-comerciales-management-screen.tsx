"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Images, Search, X } from "lucide-react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import type { AuthSession } from "../../auth/types/auth.types";
import { PhotoGallery } from "../../../shared/components/photo-gallery";
import { Pagination } from "../../../shared/components/pagination";
import type { GalleryPhoto } from "../../../shared/utils/photo-resource-cache";
import {
  fotosComercialesService,
  type FotoComercial,
  type ProductorConFotos
} from "../services/fotos-comerciales.service";
import styles from "./fotos-comerciales.module.css";

const lastUpload = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeZone: "America/Lima"
});

export function FotosComercialesManagementScreen() {
  const { session } = useAuthSession();
  if (!session) return null;
  return <ProducerPhotos key={session.user.publicId} session={session} />;
}

function ProducerPhotos({ session }: { session: AuthSession }) {
  const [items, setItems] = useState<ProductorConFotos[]>([]);
  const [photos, setPhotos] = useState<FotoComercial[]>([]);
  const [selected, setSelected] = useState<ProductorConFotos | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [photoPage, setPhotoPage] = useState(1);
  const [photoTotal, setPhotoTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const galleryAnchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void fotosComercialesService
      .listProducers(session, page, query)
      .then(
        (result) => {
          if (active) {
            setItems(result.items);
            setTotal(result.total);
          }
        },
        () => {
          if (active) setError("No se pudo consultar la lista de productores con fotos.");
        }
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, page, query, attempt]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setPhotoLoading(true);
    setPhotoError("");
    void fotosComercialesService
      .listPhotos(session, selected.productorId, photoPage)
      .then(
        (result) => {
          if (active) {
            setPhotos(result.items);
            setPhotoTotal(result.total);
          }
        },
        () => {
          if (active) {
            setPhotos([]);
            setPhotoError("No se pudieron consultar las fotos del productor.");
          }
        }
      )
      .finally(() => {
        if (active) setPhotoLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, selected, photoPage, photoAttempt]);

  const loadPhoto = useCallback(
    (photo: GalleryPhoto) => fotosComercialesService.viewPhoto(session, photo.id),
    [session]
  );

  function selectProducer(producer: ProductorConFotos) {
    setSelected(producer);
    setPhotos([]);
    setPhotoTotal(0);
    setPhotoPage(1);
    setPhotoLoading(true);
    setPhotoAttempt((value) => value + 1);
    window.requestAnimationFrame(() =>
      galleryAnchor.current?.scrollIntoView({ block: "start" })
    );
  }

  function closeGallery() {
    setSelected(null);
    setPhotos([]);
    setPhotoTotal(0);
    setPhotoError("");
    document.getElementById(`producer-photos-${selected?.productorId}`)?.focus();
  }

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href="/mantenimiento/acreedores-cosecha">
            <ArrowLeft size={16} /> Volver a acreedores
          </Link>
          <span className={styles.eyebrow}>Mantenimiento · Comercial</span>
          <h1>Fotos por productor</h1>
          <p>
            Revisa las imágenes enviadas por los agrónomos, organizadas por productor.
          </p>
        </div>
        <span className={styles.headerIcon}>
          <Images size={30} />
        </span>
      </header>
      <section
        className={styles.panel}
        aria-label="Productores con fotos"
        aria-busy={loading}
      >
        <div className={styles.toolbar}>
          <div>
            <h2>Productores con fotos</h2>
            <p>
              {loading
                ? "Consultando productores…"
                : `${total} ${total === 1 ? "productor disponible" : "productores disponibles"}`}
            </p>
          </div>
          <label className={styles.search}>
            <Search size={18} />
            <span className={styles.srOnly}>Buscar productor</span>
            <input
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre…"
            />
            {search && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </label>
        </div>
        {error ? (
          <div className={styles.empty} role="alert">
            <strong>No se pudo cargar la lista</strong>
            <p>{error}</p>
            <button
              type="button"
              className={styles.action}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className={styles.listSkeleton} role="status">
            <span className={styles.srOnly}>Cargando productores</span>
            {[0, 1, 2].map((index) => (
              <div key={index} aria-hidden="true" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Images size={34} />
            <strong>
              {query ? "No encontramos productores" : "Aún no hay fotos subidas"}
            </strong>
            <p>
              {query
                ? "Prueba con otro nombre o limpia la búsqueda."
                : "Cuando se envíen fotos desde la app, aparecerán aquí."}
            </p>
            {query && (
              <button
                className={styles.action}
                type="button"
                onClick={() => setSearch("")}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Productor</th>
                  <th>Fotos</th>
                  <th>Última carga</th>
                  <th>
                    <span className={styles.srOnly}>Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.productorId}
                    data-selected={selected?.productorId === item.productorId}
                  >
                    <td>
                      <span className={styles.producer}>
                        <span className={styles.avatar}>
                          {item.productorNombre.trim().charAt(0).toUpperCase() || "P"}
                        </span>
                        <strong>{item.productorNombre}</strong>
                      </span>
                    </td>
                    <td>
                      <span className={styles.badge}>
                        <Images size={14} /> {item.cantidadFotos}
                      </span>
                    </td>
                    <td>
                      <time dateTime={item.ultimaFotoAt}>
                        {Number.isNaN(Date.parse(item.ultimaFotoAt))
                          ? "Sin fecha"
                          : lastUpload.format(new Date(item.ultimaFotoAt))}
                      </time>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.action}
                        id={`producer-photos-${item.productorId}`}
                        aria-label={`Ver fotos de ${item.productorNombre}`}
                        aria-expanded={selected?.productorId === item.productorId}
                        aria-controls="producer-photo-gallery"
                        onClick={() => selectProducer(item)}
                      >
                        Ver fotos <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!error && !loading && total > 20 && (
          <div className={styles.pagination}>
            <Pagination
              page={page}
              totalPages={Math.ceil(total / 20)}
              loading={loading}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
      <div id="producer-photo-gallery" ref={galleryAnchor} className={styles.anchor}>
        {selected ? (
          <PhotoGallery
            key={selected.productorId}
            title={selected.productorNombre}
            description="Fotos comerciales del productor. Abre una imagen para revisarla con más detalle."
            photos={photos}
            total={photoTotal}
            page={photoPage}
            loading={photoLoading}
            error={photoError}
            loadPhoto={loadPhoto}
            onPageChange={(nextPage) => {
              setPhotoLoading(true);
              setPhotoPage(nextPage);
            }}
            onRetry={() => setPhotoAttempt((value) => value + 1)}
            onClose={closeGallery}
          />
        ) : (
          <div className={styles.prompt}>
            <Images size={22} />
            <p>Selecciona un productor para explorar sus fotos.</p>
          </div>
        )}
      </div>
    </section>
  );
}
