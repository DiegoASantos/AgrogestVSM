import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="state-card state-card--empty">
      <p className="eyebrow">Sin resultados</p>
      <h3 className="title title--section">{title}</h3>
      <p className="body-copy">{description}</p>
      {action ? <div className="actions">{action}</div> : null}
    </section>
  );
}
