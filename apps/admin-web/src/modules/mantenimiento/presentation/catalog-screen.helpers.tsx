import type { ReactNode } from "react";

import type { CatalogOption } from "../types/agricultural-catalogs.types";

export type StatusFilter = "all" | "active" | "inactive";

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

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function renderStatusBadge(isActive: boolean): ReactNode {
  return (
    <span className={`table-badge ${isActive ? "" : "table-badge--muted"}`}>
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

export function buildOptionsLookup(options: CatalogOption[]) {
  return options.reduce<Record<string, string>>((accumulator, option) => {
    accumulator[option.id] = option.label;

    return accumulator;
  }, {});
}

export function formatDateLabel(value: string | null) {
  if (!value) {
    return "No definida";
  }

  return value;
}
