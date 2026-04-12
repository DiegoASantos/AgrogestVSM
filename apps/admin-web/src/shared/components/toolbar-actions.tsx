import { ReactNode } from "react";

type ToolbarActionsProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function ToolbarActions({
  eyebrow,
  title,
  description,
  actions
}: ToolbarActionsProps) {
  return (
    <header className="toolbar-actions">
      <div className="toolbar-actions__copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="title title--section">{title}</h2>
        {description ? <p className="body-copy">{description}</p> : null}
      </div>
      {actions ? <div className="toolbar-actions__actions">{actions}</div> : null}
    </header>
  );
}
