import type { ReactNode } from "react";

export type StatusFilter = "all" | "active" | "inactive";

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function matchesStatusFilter(
  isActive: boolean,
  filter: StatusFilter
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return isActive;
  }

  return !isActive;
}

export function renderStatusBadge(isActive: boolean): ReactNode {
  return (
    <span className={`table-badge ${isActive ? "" : "table-badge--muted"}`}>
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}
