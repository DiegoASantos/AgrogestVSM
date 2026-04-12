import { ActionLink } from "./action-link";

type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
};

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  backHref,
  backLabel
}: ModulePlaceholderProps) {
  return (
    <section className="panel-grid">
      <article className="panel">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="title title--section">{title}</h2>
        <p className="body-copy">{description}</p>

        <div className="actions">
          <ActionLink href={backHref} label={backLabel} />
        </div>
      </article>
    </section>
  );
}
