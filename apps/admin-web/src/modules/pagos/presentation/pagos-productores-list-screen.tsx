"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { pagosService } from "../services/pagos.service";
import type { PagoProductor, PagoProductorStatus } from "../types/pagos.types";
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
  const pageCount = Math.max(1, Math.ceil(total / 50));
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
          <p>{total} registros · Los importes se guardan como fueron ingresados.</p>
        </div>
        <button className={styles.secondary} onClick={() => void load()} type="button">
          Actualizar
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
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.fechaRecepcion}</td>
                  <td>{item.productorNombre}</td>
                  <td>
                    {item.nroGuia}
                    <small>{item.lote}</small>
                  </td>
                  <td>{item.variedad}</td>
                  <td>{item.jabas}</td>
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
