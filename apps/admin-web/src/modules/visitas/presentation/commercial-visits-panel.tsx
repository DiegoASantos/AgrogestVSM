"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { toApiError } from "../../../shared/services";
import { PhotoGallery } from "../../../shared/components/photo-gallery";
import { ErrorState } from "../../../shared/components/error-state";
import type { GalleryPhoto } from "../../../shared/utils/photo-resource-cache";
import type { AuthSession } from "../../auth/types/auth.types";
import {
  downloadBlob,
  visitasComercialesService,
  type VisitaComercial,
  type VisitasComercialesFilters
} from "../services/visitas-comerciales.service";

export function CommercialVisitsPanel({
  filters
}: {
  filters: VisitasComercialesFilters;
}) {
  const { session } = useAuthSession();
  const [items, setItems] = useState<VisitaComercial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected, setSelected] = useState<VisitaComercial | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters.startDate, filters.endDate, filters.agronomistUserId]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    setListError(null);
    setDownloadError(null);
    setSelected(null);
    void visitasComercialesService
      .list(session, filters, page)
      .then((result) => {
        if (active) {
          setItems(result.items);
          setTotal(result.total);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setItems([]);
          setTotal(0);
          const apiError = toApiError(reason);
          setListError(apiError.statusCode === 401
            ? "La sesión no es válida. Inicia sesión nuevamente para consultar las visitas."
            : apiError.statusCode && apiError.statusCode >= 500
              ? "No se pudieron cargar las visitas comerciales. Reintenta; si persiste, revisa el servidor."
              : apiError.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, filters.startDate, filters.endDate, filters.agronomistUserId, page, attempt]);

  async function pdf(visita: VisitaComercial) {
    if (!session) return;
    setDownloading(visita.publicId);
    setDownloadError(null);
    try {
      const report = await visitasComercialesService.downloadPdf(
        session,
        visita.publicId
      );
      downloadBlob(
        report.blob,
        report.fileName ?? `visita-comercial-${visita.fechaVisita}.pdf`
      );
    } catch (reason) {
      setDownloadError(toApiError(reason).message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <article className="panel report-section">
      <h2>Visitas comerciales{!loading && !listError ? ` (${total})` : ""}</h2>
      <p>Registros comerciales independientes de las parcelas.</p>
      {listError ? (
        <ErrorState
          description={listError}
          action={
            <button className="ui-button ui-button--secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </button>
          }
        />
      ) : null}
      {downloadError ? <p className="form-error">{downloadError}</p> : null}
      {loading ? <p>Cargando visitas comerciales...</p> : null}
      {!loading && !listError && items.length === 0 ? (
        <p>No hay visitas comerciales para los filtros seleccionados.</p>
      ) : null}
      {!loading && !listError && items.length > 0 ? (
        <div className="data-table__wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Agrónomo</th>
                <th>Descripción</th>
                <th>Reporte</th>
              </tr>
            </thead>
            <tbody>
              {items.map((visita) => (
                <tr key={visita.publicId}>
                  <td>{visita.fechaVisita}</td>
                  <td>{visita.tipoSujeto}</td>
                  <td>{[visita.nombres, visita.apellidos].filter(Boolean).join(" ")}</td>
                  <td>{visita.agronomoNombre ?? visita.agronomoUsuarioId}</td>
                  <td>
                    <button
                      className="ui-button ui-button--ghost ui-button--compact"
                      type="button"
                      onClick={() => setSelected(visita)}
                    >
                      Ver detalle
                    </button>
                  </td>
                  <td>
                    <button
                      className="ui-button ui-button--secondary ui-button--compact"
                      type="button"
                      disabled={downloading === visita.publicId}
                      onClick={() => void pdf(visita)}
                    >
                      {downloading === visita.publicId
                        ? "Descargando..."
                        : "Descargar PDF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {selected ? (
        <div
          className="filter-card"
          role="region"
          aria-label="Detalle de visita comercial"
        >
          <h3>
            Visita comercial:{" "}
            {[selected.nombres, selected.apellidos].filter(Boolean).join(" ")}
          </h3>
          <p>{selected.descripcion}</p>
          <p>
            Fecha: {selected.fechaVisita} · Tipo: {selected.tipoSujeto}
          </p>
          <p>
            Ubicación:{" "}
            {selected.ubicacionVisita
              ? selected.ubicacionVisita.coordinates.join(", ")
              : "No disponible"}
          </p>
          {session && selected.productorId ? <CommercialVisitPhotos key={selected.id} session={session} visitId={selected.id} /> : null}
          <button
            className="ui-button ui-button--ghost"
            type="button"
            onClick={() => setSelected(null)}
          >
            Cerrar
          </button>
        </div>
      ) : null}
      {!listError && total > 20 ? (
        <div className="flex gap-2 items-center">
          <button
            className="ui-button ui-button--ghost"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page} de {Math.ceil(total / 20)}
          </span>
          <button
            className="ui-button ui-button--ghost"
            type="button"
            disabled={page * 20 >= total}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </article>
  );
}

function CommercialVisitPhotos({ session, visitId }: { session: AuthSession; visitId: string }) {
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
    void visitasComercialesService.listPhotos(session, visitId, page).then((result) => {
      if (active) { setPhotos(result.items); setTotal(result.total); }
    }, () => {
      if (active) { setPhotos([]); setError("No se pudieron cargar las fotos de la visita."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, visitId, page, attempt]);
  const loadPhoto = useCallback((photo: GalleryPhoto) =>
    visitasComercialesService.viewPhoto(session, visitId, photo.id), [session, visitId]);
  return <PhotoGallery title="Evidencia fotográfica" description="Fotos adjuntas a esta visita comercial."
    photos={photos} total={total} page={page} loading={loading} error={error}
    loadPhoto={loadPhoto} onPageChange={setPage} onRetry={() => setAttempt((value) => value + 1)} />;
}
