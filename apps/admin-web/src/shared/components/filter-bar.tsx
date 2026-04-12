import { ReactNode } from "react";

type FilterBarProps = {
  children: ReactNode;
  actions?: ReactNode;
};

export function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <section className="filter-bar">
      <div className="filter-bar__fields">{children}</div>
      {actions ? <div className="filter-bar__actions">{actions}</div> : null}
    </section>
  );
}
