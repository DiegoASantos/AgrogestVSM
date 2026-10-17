"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import type {
  DetallePagoProductor,
  PagoProductor,
  PagoProductorStatus
} from "../types/pagos.types";
import styles from "./pagos.module.css";

const labels: Record<PagoProductorStatus, string> = {
  BORRADOR: "Borrador",
  OBSERVADO: "Observado",
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  ANULADO: "Anulado"
};

export function PagosProductoresListScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [items, setItems] = useState<PagoProductor[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [producers, setProducers] = useState<Array<{ id: string; nombre: string }>>([]);
  const [producerId, setProducerId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const load = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const response = await pagosService.list(session, page);
      setItems(response.items);
      setTotal(response.total);
    } catch {
      setError("No se pudieron cargar los pagos. Actualiza e inténtalo nuevamente.");
    }
  }, [session, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!session) return;
    void pagosService
      .catalogs(session)
      .then((result) => {
        setProducers(result.productores.map(({ id, nombre }) => ({ id, nombre })));
      })
      .catch(() => {
        setError("No se pudo cargar el catálogo de productores para el reporte.");
      });
  }, [session]);
  const pageCount = Math.max(1, Math.ceil(total / 50));
  const rows = items.reduce<
    Array<{
      payment: PagoProductor;
      detail: DetallePagoProductor | null;
    }>
  >((result, payment) => {
    if (payment.detalles?.length) {
      result.push(...payment.detalles.map((detail) => ({ payment, detail })));
    } else {
      result.push({ payment, detail: null });
    }
    return result;
  }, []);
  async function downloadReport() {
    if (!session) return;
    setReportBusy(true);
    setError("");
    try {
      const result = await pagosService.downloadReport(session, {
        productorId: producerId,
        fechaDesde,
        fechaHasta
      });
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName ?? "reporte-pagos-productores.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "No se pudo descargar el reporte PDF."
      );
    } finally {
      setReportBusy(false);
    }
  }
  async function remove(item: PagoProductor) {
    if (
      !session ||
      !window.confirm(
        `¿Eliminar el pago de guía ${item.nroGuia}? Si tiene detalles, se conservarán anulados.`
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await pagosService.remove(session, item.id);
      setNotice(
        result.eliminado
          ? "Borrador eliminado."
          : "Pago y detalles anulados; se conservó el historial."
      );
      await load();
    } catch {
      setError("No se pudo eliminar el pago.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Administración · Finanzas de campo</span>
          <h1>Pagos</h1>
          <p>Registro manual de liquidaciones y distribución por acreedor.</p>
        </div>
        <button
          className={styles.primary}
          type="button"
          onClick={() => router.push("/pagos/productores/nuevo")}
        >
          Nuevo pago
        </button>
      </header>
      <nav className={styles.tabs} aria-label="Secciones de pagos">
        {["Resumen", "Productores", "Cosecha", "Transportistas"].map((tab) => (
          <button
            key={tab}
            type="button"
            aria-current={tab === "Productores" ? "page" : undefined}
          >
            {tab}
          </button>
        ))}
      </nav>
      {notice && (
        <p className={styles.success} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.sectionHeading}>
        <div>
          <h2>Liquidaciones de productores</h2>
          <p>
            {total} registros · Consulta los detalles para ver su estado y fecha de pago.
          </p>
        </div>
        <button className={styles.secondary} onClick={() => void load()} type="button">
          Actualizar
        </button>
      </div>
      <div className={styles.filters}>
        <label>
          Productor
          <select
            value={producerId}
            onChange={(event) => setProducerId(event.target.value)}
          >
            <option value="">Todos</option>
            {producers.map((producer) => (
              <option key={producer.id} value={producer.id}>
                {producer.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recepción desde
          <input
            type="date"
            value={fechaDesde}
            onChange={(event) => setFechaDesde(event.target.value)}
          />
        </label>
        <label>
          Recepción hasta
          <input
            type="date"
            value={fechaHasta}
            onChange={(event) => setFechaHasta(event.target.value)}
          />
        </label>
        <button
          className={styles.secondary}
          disabled={reportBusy}
          onClick={() => void downloadReport()}
          type="button"
        >
          {reportBusy ? "Generando PDF..." : "Descargar reporte PDF"}
        </button>
      </div>
      {items.length === 0 ? (
        <div className={styles.empty}>
          <strong>No hay pagos registrados</strong>
          <p>Crea una liquidación manual para comenzar.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Recepción</th>
                <th>Productor</th>
                <th>Guía / Lote</th>
                <th>Variedad</th>
                <th>Jabas</th>
                <th>Total después de detracción</th>
                <th>N.º de liquidación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ payment: item, detail }) => (
                <tr key={`${item.id}:${detail?.id ?? "sin-detalle"}`}>
                  <td>{item.fechaRecepcion}</td>
                  <td>
                    {item.productorNombre}
                    <small>{detail?.acreedorNombre ?? ""}</small>
                  </td>
                  <td>
                    {item.nroGuia}
                    <small>{item.lote}</small>
                  </td>
                  <td>{item.variedad}</td>
                  <td>{detail?.cantidadJabas ?? item.jabas}</td>
                  <td>
                    {detail ? `S/ ${Number(detail.totalPostDetraccion).toFixed(2)}` : "—"}
                  </td>
                  <td>{detail?.nroLiquidacion || "—"}</td>
                  <td>
                    <span
                      className={`${styles.status} ${styles[`status${item.estado}`]}`}
                    >
                      {labels[item.estado]}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => router.push(`/pagos/productores/${item.id}/editar`)}
                    >
                      Ver / editar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(item)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={styles.pagination}>
        <button
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
          type="button"
        >
          Anterior
        </button>
        <span>
          Página {page} de {pageCount}
        </span>
        <button
          disabled={page >= pageCount}
          onClick={() => setPage((value) => value + 1)}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}
