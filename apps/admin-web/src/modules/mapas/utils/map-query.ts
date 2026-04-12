import { adminRoutes } from "../../../shared/constants/site";

export type AdminMapFilterState = {
  productorId: string;
  sectorId: string;
  parcelaId: string;
  agronomistUserId: string;
  campaignId: string;
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

export type AdminMapHrefInput = Partial<AdminMapFilterState & AdminMapSelectionState>;

export const emptyAdminMapFilters: AdminMapFilterState = {
  productorId: "",
  sectorId: "",
  parcelaId: "",
  agronomistUserId: "",
  campaignId: "",
  startDate: "",
  endDate: ""
};

export function buildAdminMapHref(input: AdminMapHrefInput = {}) {
  const searchParams = new URLSearchParams();

  appendParam(searchParams, "productorId", input.productorId);
  appendParam(searchParams, "sectorId", input.sectorId);
  appendParam(searchParams, "parcelaId", input.parcelaId);
  appendParam(searchParams, "agronomistUserId", input.agronomistUserId);
  appendParam(searchParams, "campaignId", input.campaignId);
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
      parcelaId: readParam(searchParams, "parcelaId"),
      agronomistUserId: readParam(searchParams, "agronomistUserId"),
      campaignId: readParam(searchParams, "campaignId"),
      startDate: readParam(searchParams, "startDate"),
      endDate: readParam(searchParams, "endDate")
    },
    selection: {
      visitaId: readParam(searchParams, "visitaId")
    }
  };
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
