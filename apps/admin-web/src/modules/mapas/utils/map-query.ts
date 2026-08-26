import { adminRoutes } from "../../../shared/constants/site";

export type AdminMapFilterState = {
  productorId: string;
  sectorId: string;
  agronomistUserId: string;
  campaignId: string;
  phenologicalStageIds: string[];
  startDate: string;
  endDate: string;
};

export type AdminMapSelectionState = {
  visitaId: string;
};

export type AdminMapQueryState = {
  filters: AdminMapFilterState;
  selection: AdminMapSelectionState;
};

export type AdminMapHrefInput = Partial<AdminMapFilterState & AdminMapSelectionState> & {
  /** Compatibilidad con enlaces existentes; Mapas ya no filtra por parcela. */
  parcelaId?: string;
};

export const emptyAdminMapFilters: AdminMapFilterState = {
  productorId: "",
  sectorId: "",
  agronomistUserId: "",
  campaignId: "",
  phenologicalStageIds: [],
  startDate: "",
  endDate: ""
};

export function buildAdminMapHref(input: AdminMapHrefInput = {}) {
  const searchParams = new URLSearchParams();

  appendParam(searchParams, "productorId", input.productorId);
  appendParam(searchParams, "sectorId", input.sectorId);
  appendParam(searchParams, "agronomistUserId", input.agronomistUserId);
  appendParam(searchParams, "campaignId", input.campaignId);
  appendListParam(searchParams, "phenologicalStageIds", input.phenologicalStageIds);
  appendParam(searchParams, "startDate", input.startDate);
  appendParam(searchParams, "endDate", input.endDate);
  appendParam(searchParams, "visitaId", input.visitaId);

  const query = searchParams.toString();

  return query ? `${adminRoutes.mapas}?${query}` : adminRoutes.mapas;
}

export function readAdminMapQuery(searchParams: {
  get(name: string): string | null;
}): AdminMapQueryState {
  return {
    filters: {
      productorId: readParam(searchParams, "productorId"),
      sectorId: readParam(searchParams, "sectorId"),
      agronomistUserId: readParam(searchParams, "agronomistUserId"),
      campaignId: readParam(searchParams, "campaignId"),
      phenologicalStageIds: readListParam(searchParams, "phenologicalStageIds"),
      startDate: readParam(searchParams, "startDate"),
      endDate: readParam(searchParams, "endDate")
    },
    selection: {
      visitaId: readParam(searchParams, "visitaId")
    }
  };
}

function appendListParam(
  searchParams: URLSearchParams,
  key: string,
  values: string[] | undefined
) {
  const normalizedValues = Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter(Boolean))
  );

  if (normalizedValues.length > 0) {
    searchParams.set(key, normalizedValues.join(","));
  }
}

function appendParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | undefined
) {
  if (!value) {
    return;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return;
  }

  searchParams.set(key, normalizedValue);
}

function readParam(
  searchParams: {
    get(name: string): string | null;
  },
  key: string
) {
  return searchParams.get(key)?.trim() ?? "";
}

function readListParam(
  searchParams: {
    get(name: string): string | null;
  },
  key: string
) {
  return Array.from(
    new Set(
      (searchParams.get(key) ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}
