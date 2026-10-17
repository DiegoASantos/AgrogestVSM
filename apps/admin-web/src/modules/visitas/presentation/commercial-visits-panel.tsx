"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { toApiError } from "../../../shared/services";
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
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected, setSelected] = useState<VisitaComercial | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters.startDate, filters.endDate, filters.agronomistUserId]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    setError(null);
    void visitasComercialesService
      .list(session, filters, page)
      .then((result) => {
        if (active) {
          setItems(result.items);
          setTotal(result.total);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(toApiError(reason).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, filters.startDate, filters.endDate, filters.agronomistUserId, page]);

  async function pdf(visita: VisitaComercial) {
    if (!session) return;
    setDownloading(visita.publicId);
    setError(null);
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
      setError(toApiError(reason).message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <article className="panel report-section">
      <h2>Visitas comerciales{!loading ? ` (${total})` : ""}</h2>
      <p>Registros comerciales independientes de las parcelas.</p>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Cargando visitas comerciales...</p> : null}
      {!loading && items.length === 0 ? (
        <p>No hay visitas comerciales para los filtros seleccionados.</p>
      ) : null}
      {!loading && items.length > 0 ? (
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
          <button
            className="ui-button ui-button--ghost"
            type="button"
            onClick={() => setSelected(null)}
          >
            Cerrar
          </button>
        </div>
      ) : null}
      {total > 20 ? (
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
