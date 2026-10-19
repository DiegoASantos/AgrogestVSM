"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Expand,
  ImageOff,
  Images,
  LoaderCircle,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  createPhotoResourceCache,
  type GalleryPhoto
} from "../utils/photo-resource-cache";
import { Pagination } from "./pagination";
import styles from "./photo-gallery.module.css";

export type PhotoGalleryProps = {
  title: string;
  description?: string;
  photos: GalleryPhoto[];
  total: number;
  page: number;
  loading: boolean;
  error?: string;
  loadPhoto: (photo: GalleryPhoto) => Promise<string>;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onClose?: () => void;
};

type Resources = ReturnType<typeof createPhotoResourceCache>;
const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima"
});

function photoDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : dateFormatter.format(date);
}

function usePhoto(photo: GalleryPhoto, resources: Resources | null, enabled = true) {
  const { id, createdAt } = photo;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    id: string;
    resources: Resources;
    url?: string;
    failed?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!resources || !enabled) return;
    let active = true;
    setResult(null);
    void resources.get({ id, createdAt }).then(
      (url) => {
        if (active) setResult({ id, resources, url });
      },
      () => {
        if (active) setResult({ id, resources, failed: true });
      }
    );
    return () => {
      active = false;
    };
  }, [id, createdAt, resources, enabled, attempt]);
  const current =
    result?.id === photo.id && result.resources === resources ? result : null;
  return {
    url: current?.url,
    failed: current?.failed,
    retry: () => {
      resources?.invalidate(photo);
      setAttempt((value) => value + 1);
    }
  };
}

function PhotoTile({
  photo,
  number,
  resources,
  onOpen
}: {
  photo: GalleryPhoto;
  number: number;
  resources: Resources | null;
  onOpen: () => void;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = tileRef.current;
    if (!target) return;
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const { url, failed, retry } = usePhoto(photo, resources, visible);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const failedImage = failed || Boolean(url && brokenUrl === url);
  return (
    <div ref={tileRef} className={styles.tile}>
      <button
        type="button"
        className={styles.tileButton}
        onClick={onOpen}
        aria-label={`Ampliar foto ${number}`}
      >
        <span className={styles.thumbnail}>
          {url && !failedImage ? (
            // Private blob URL from the authenticated reader; the cache owns its lifetime.
            <img
              src={url}
              alt={`Foto ${number}`}
              loading="lazy"
              onError={() => setBrokenUrl(url)}
            />
          ) : (
            <span className={styles.placeholder}>
              {failedImage ? (
                <ImageOff size={28} />
              ) : (
                <LoaderCircle className={styles.spin} size={24} />
              )}
              <span>
                {failedImage ? "Vista previa no disponible" : "Cargando imagen…"}
              </span>
            </span>
          )}
          <span className={styles.expand}>
            <Expand size={16} /> Ampliar
          </span>
        </span>
        <span className={styles.tileInfo}>
          <strong>Foto {number}</strong>
          <span>
            <CalendarDays size={13} /> {photoDate(photo.createdAt)}
          </span>
        </span>
      </button>
      {failedImage && (
        <button
          type="button"
          className={styles.retry}
          onClick={() => {
            setBrokenUrl(null);
            retry();
          }}
        >
          <RotateCcw size={14} /> Reintentar vista previa
        </button>
      )}
    </div>
  );
}

function PhotoViewer({
  photos,
  index,
  offset,
  title,
  resources,
  onSelect,
  onClose
}: {
  photos: GalleryPhoto[];
  index: number;
  offset: number;
  title: string;
  resources: Resources | null;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [zoom, setZoom] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const photo = photos[index];
  const { url, failed, retry } = usePhoto(photo, resources);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  useEffect(() => {
    setZoom(1);
    setImageFailed(false);
    imageRef.current?.scrollTo(0, 0);
    // Navigation can disable the focused zoom/arrow control while the next file loads.
    if (!dialogRef.current?.contains(document.activeElement)) closeRef.current?.focus();
  }, [photo.id]);

  function changeIndex(next: number) {
    if (next >= 0 && next < photos.length) onSelect(next);
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.viewer}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)"
          );
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          changeIndex(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div className={styles.viewerShell}>
        <header className={styles.viewerHeader}>
          <div className={styles.viewerTitle}>
            <Images size={20} />
            <div>
              <h3 id={titleId}>{title}</h3>
              <p aria-live="polite">
                Foto {offset + index + 1} · {photoDate(photo.createdAt)}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.viewerButton}
            onClick={onClose}
            aria-label="Cerrar visor"
          >
            <X size={22} />
          </button>
        </header>
        <div className={styles.stage}>
          <div ref={imageRef} className={styles.imageScroll}>
            {failed || imageFailed ? (
              <div className={styles.viewerMessage} role="alert">
                <ImageOff size={36} />
                <strong>No se pudo abrir la imagen</strong>
                <p>Comprueba tu conexión e inténtalo de nuevo.</p>
                <button
                  type="button"
                  className={styles.viewerButton}
                  onClick={() => {
                    setImageFailed(false);
                    retry();
                  }}
                >
                  <RotateCcw size={16} /> Reintentar
                </button>
              </div>
            ) : url ? (
              <div
                className={styles.imageCanvas}
                style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
              >
                <img
                  src={url}
                  alt={`Foto ${offset + index + 1} de ${title}`}
                  onError={() => setImageFailed(true)}
                />
              </div>
            ) : (
              <div className={styles.viewerMessage} role="status">
                <LoaderCircle className={styles.spin} size={30} /> Cargando imagen…
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.viewerButton} ${styles.previous}`}
                aria-label="Foto anterior"
                disabled={index === 0}
                onClick={() => changeIndex(index - 1)}
              >
                <ArrowLeft size={22} />
              </button>
              <button
                type="button"
                className={`${styles.viewerButton} ${styles.next}`}
                aria-label="Foto siguiente"
                disabled={index === photos.length - 1}
                onClick={() => changeIndex(index + 1)}
              >
                <ArrowRight size={22} />
              </button>
            </>
          )}
        </div>
        <footer className={styles.viewerFooter}>
          <span>
            {index + 1} de {photos.length} en esta página
          </span>
          <div
            className={styles.zoomControls}
            role="group"
            aria-label="Zoom de la imagen"
          >
            <button
              type="button"
              className={styles.viewerButton}
              aria-label="Reducir zoom"
              disabled={zoom <= 1 || !url}
              onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
            >
              <ZoomOut size={18} />
            </button>
            <span aria-live="polite">{zoom * 100}%</span>
            <button
              type="button"
              className={styles.viewerButton}
              aria-label="Aumentar zoom"
              disabled={zoom >= 3 || !url}
              onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              className={styles.viewerButton}
              onClick={() => setZoom(1)}
              disabled={zoom === 1}
            >
              Ajustar
            </button>
          </div>
          <span className={styles.keyboardHint}>← → Navegar · Esc Cerrar</span>
        </footer>
      </div>
    </dialog>
  );
}

/** Shared web presentation for authenticated creditor and commercial-visit photos. */
export function PhotoGallery({
  title,
  description,
  photos,
  total,
  page,
  loading,
  error,
  loadPhoto,
  onPageChange,
  onRetry,
  onClose
}: PhotoGalleryProps) {
  const headingId = useId();
  const [resources, setResources] = useState<Resources | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const cache = createPhotoResourceCache(loadPhoto);
    setResources(cache);
    return () => cache.dispose();
  }, [loadPhoto, page]);
  useEffect(() => {
    setSelected(null);
  }, [page, loading, loadPhoto]);
  const offset = (page - 1) * 20;

  return (
    <section className={styles.gallery} aria-labelledby={headingId} aria-busy={loading}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.headingIcon}>
            <Images size={23} />
          </span>
          <div>
            <span className={styles.eyebrow}>Galería de fotos</span>
            <h2 id={headingId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </div>
        <div className={styles.headerActions}>
          {!loading && !error && (
            <span className={styles.count}>
              {total} {total === 1 ? "foto" : "fotos"}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Cerrar galería"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>
      {loading ? (
        <div role="status">
          <span className={styles.loadingLabel}>Cargando fotos…</span>
          <div className={styles.grid} aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={styles.skeleton} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className={styles.empty} role="alert">
          <ImageOff size={32} />
          <strong>No se pudieron cargar las fotos</strong>
          <p>{error}</p>
          <button type="button" className={styles.retry} onClick={onRetry}>
            <RotateCcw size={16} /> Reintentar
          </button>
        </div>
      ) : photos.length === 0 ? (
        <div className={styles.empty}>
          <Images size={36} />
          <strong>Aún no hay fotos</strong>
          <p>Las imágenes subidas aparecerán aquí para su revisión.</p>
        </div>
      ) : (
        <>
          <p className={styles.summary}>
            Mostrando {offset + 1}–{offset + photos.length} de {total}. Selecciona una
            imagen para ampliarla.
          </p>
          <div className={styles.grid}>
            {photos.map((photo, index) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                number={offset + index + 1}
                resources={resources}
                onOpen={() => setSelected(index)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={Math.ceil(total / 20)}
            onPageChange={onPageChange}
            loading={loading}
          />
        </>
      )}
      {!loading && !error && selected !== null && photos[selected] && (
        <PhotoViewer
          title={title}
          photos={photos}
          index={selected}
          offset={offset}
          resources={resources}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
