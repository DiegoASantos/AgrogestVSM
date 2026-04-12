"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  variant = "danger",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, isLoading, onCancel]);

  if (!open) {
    return null;
  }

  const confirmButtonClass =
    variant === "warning"
      ? "ui-button ui-button--secondary"
      : "ui-button ui-button--danger";

  return (
    <div
      className="confirm-dialog__overlay"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="confirm-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <p className="eyebrow">Confirmacion</p>
        <h3 className="title title--section">{title}</h3>
        <p className="body-copy">{description}</p>

        <div className="confirm-dialog__actions">
          <button
            className="ui-button ui-button--ghost"
            disabled={isLoading}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={confirmButtonClass}
            disabled={isLoading}
            onClick={onConfirm}
            type="button"
          >
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
