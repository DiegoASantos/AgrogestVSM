import { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "No se pudo cargar el contenido",
  description,
  action
}: ErrorStateProps) {
  return (
    <section className="state-card state-card--error" role="alert">
      <p className="eyebrow">Error</p>
      <h3 className="title title--section">{title}</h3>
      <p className="body-copy">{description}</p>
      {action ? <div className="actions">{action}</div> : null}
    </section>
  );
}
