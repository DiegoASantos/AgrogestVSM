"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect } from "react";

export type ToastKind = "success" | "error" | "info";

export type ToastState = {
  kind: ToastKind;
  message: string;
};

type ToastProps = {
  toast: ToastState | null;
  onDismiss: () => void;
  durationMs?: number;
};

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export function Toast({ toast, onDismiss, durationMs = 4500 }: ToastProps) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, onDismiss, toast]);

  if (!toast) {
    return null;
  }

  const Icon = toastIcons[toast.kind];

  return (
    <section
      aria-atomic="true"
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      className={`toast toast--${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <Icon aria-hidden="true" className="toast__icon" size={20} />
      <p>{toast.message}</p>
      <button
        aria-label="Cerrar notificacion"
        className="toast__close"
        onClick={onDismiss}
        type="button"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </section>
  );
}
