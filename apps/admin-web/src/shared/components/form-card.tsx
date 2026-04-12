import { ReactNode } from "react";

type FormCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function FormCard({
  eyebrow,
  title,
  description,
  children,
  footer
}: FormCardProps) {
  return (
    <article className="panel form-card">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="title title--section">{title}</h2>
      {description ? <p className="body-copy">{description}</p> : null}
      <div className="form-card__body">{children}</div>
      {footer ? <div className="form-card__footer">{footer}</div> : null}
    </article>
  );
}
