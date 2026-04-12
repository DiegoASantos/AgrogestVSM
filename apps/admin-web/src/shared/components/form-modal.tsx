"use client";

import { useEffect, useRef, type ReactNode } from "react";

type FormModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function FormModal({
  open,
  onClose,
  title,
  description,
  children,
  footer
}: FormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="form-modal__overlay"
      ref={overlayRef}
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div className="form-modal" ref={contentRef} role="dialog" aria-modal="true">
        <div className="form-modal__header">
          <div className="form-modal__header-text">
            <h3 className="form-modal__title">{title}</h3>
            {description && <p className="form-modal__desc">{description}</p>}
          </div>
          <button
            className="form-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="form-modal__body">{children}</div>

        {footer && <div className="form-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
