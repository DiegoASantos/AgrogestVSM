"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "../../../modules/auth/hooks/use-auth-session";
import {
  creditorHistory,
  listCreditorReviews,
  reviewCreditor,
  type Creditor,
  type CreditorReviewPage
} from "../../../modules/comercial/services/comercial.service";
import styles from "../../../modules/comercial/presentation/comercial.module.css";

const labels = { PENDING: "Pendiente", APPROVED: "Aprobado", OBSERVED: "Observado" };

export default function CommercialReviewPage() {
  const { session } = useAuthSession();
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CreditorReviewPage | null>(null);
  const [observation, setObservation] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      setData(await listCreditorReviews(session, status, page));
    } catch {
      setMessage("No se pudo cargar la revisión. Inténtalo nuevamente.");
    }
  }, [session, status, page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function decide(item: Creditor, decision: "APPROVED" | "OBSERVED") {
    const note = observation[item.id]?.trim();
    if (decision === "OBSERVED" && !note) {
      setMessage("Escribe una observación para este perfil.");
      return;
    }
    if (!session) return;
    setBusyId(item.id);
    setMessage("");
    try {
      await reviewCreditor(session, item.id, decision, note);
      setObservation((current) => ({ ...current, [item.id]: "" }));
      await reload();
      setMessage(decision === "APPROVED" ? "Perfil aprobado." : "Observación enviada.");
    } catch {
      setMessage("El perfil cambió o no se pudo revisar. Actualiza la lista.");
    } finally {
      setBusyId("");
    }
  }

  async function showHistory(id: string) {
    if (!session) return;
    if (history[id]) {
      setHistory((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const entries = await creditorHistory(session, id);
      setHistory((current) => ({
        ...current,
        [id]: entries.map(
          (entry) =>
            `${new Date(entry.createdAt).toLocaleString("es-PE")} · ${entry.decision === "APPROVED" ? "Aprobado" : "Observado"} · Revisor ${entry.reviewerUserId}${entry.observation ? ` · ${entry.observation}` : ""}`
        )
      }));
    } catch {
      setMessage("No se pudo cargar el historial.");
    }
  }

  return (
    <section className={styles.reviewPage}>
      <div className={styles.reviewHeader}>
        <span className={styles.step}>Comercial · Control de pago</span>
        <h1>Revisión de acreedores</h1>
        <p>
          Verifica documento, banco y cuenta antes de aprobar. El perfil aprobado estará
          disponible en el registro de cosecha móvil.
        </p>
      </div>
      <div className={styles.toolbar}>
        <label htmlFor="review-status">Estado</label>
        <select
          id="review-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="PENDING">Pendientes</option>
          <option value="APPROVED">Aprobados</option>
          <option value="OBSERVED">Observados</option>
        </select>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            void reload();
          }}
        >
          Actualizar
        </button>
        <span>{data?.total ?? 0} perfiles</span>
      </div>
      {message && (
        <p role="status" className={styles.message}>
          {message}
        </p>
      )}
      {data?.items.length === 0 && (
        <p className={styles.card}>No hay perfiles en este estado.</p>
      )}
      <div className={styles.reviewList}>
        {data?.items.map((item) => (
          <article className={styles.reviewCard} key={item.id}>
            <div className={styles.reviewTop}>
              <div>
                <span className={styles.status}>{labels[item.approvalStatus]}</span>
                <h2>
                  {item.creditorFirstName} {item.creditorLastName}
                </h2>
                <p>Productor: {item.producerName || item.productorId}</p>
              </div>
              <p>{new Date(item.createdAt).toLocaleDateString("es-PE")}</p>
            </div>
            <div className={styles.reviewDetails}>
              <div>
                <span>Documento</span>
                <strong>
                  {item.creditorDocumentType} {item.creditorDocumentNumber}
                </strong>
              </div>
              <div>
                <span>Banco</span>
                <strong>{item.bank}</strong>
              </div>
              <div>
                <span>Cuenta o CCI</span>
                <strong>{item.accountNumber}</strong>
              </div>
              <div>
                <span>Captura</span>
                <strong>
                  {item.source === "PRODUCTOR" ? "Productor" : "Agrónomo móvil"} ·{" "}
                  {item.capturedBy || "Productor"}
                </strong>
              </div>
            </div>
            {item.reviewObservation && (
              <p className={styles.observation}>
                <strong>Última observación:</strong> {item.reviewObservation}
              </p>
            )}
            <button
              className={styles.linkButton}
              type="button"
              onClick={() => {
                void showHistory(item.id);
              }}
            >
              {history[item.id] ? "Ocultar historial" : "Ver historial"}
            </button>
            {history[item.id] && (
              <ul className={styles.history}>
                {history[item.id].map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            )}
            {(item.approvalStatus === "PENDING" ||
              item.approvalStatus === "APPROVED") && (
              <div className={styles.reviewActions}>
                <label htmlFor={`observation-${item.id}`}>
                  Observación para el productor
                </label>
                <textarea
                  id={`observation-${item.id}`}
                  maxLength={1000}
                  placeholder="Explica qué dato debe corregirse"
                  value={observation[item.id] ?? ""}
                  onChange={(event) =>
                    setObservation((current) => ({
                      ...current,
                      [item.id]: event.target.value
                    }))
                  }
                />
                <div>
                  {item.approvalStatus === "PENDING" && (
                    <button
                      disabled={busyId === item.id}
                      type="button"
                      onClick={() => {
                        void decide(item, "APPROVED");
                      }}
                    >
                      Aprobar
                    </button>
                  )}
                  <button
                    disabled={busyId === item.id}
                    className={styles.secondary}
                    type="button"
                    onClick={() => {
                      void decide(item, "OBSERVED");
                    }}
                  >
                    Enviar observación
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className={styles.pagination}>
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>Página {page}</span>
        <button
          type="button"
          disabled={!data || page * data.pageSize >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}
