import { ReactNode } from "react";

type FilterBarProps = {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function FilterBar({ children, actions, className }: FilterBarProps) {
  const filterBarClassName = className ? `filter-bar ${className}` : "filter-bar";

  return (
    <section className={filterBarClassName}>
      <div className="filter-bar__fields">{children}</div>
      {actions ? <div className="filter-bar__actions">{actions}</div> : null}
    </section>
  );
}
