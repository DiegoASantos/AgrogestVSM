import type { AuthSession } from "../../auth/types/auth.types";
import type { ParcelaListItem } from "../../parcelas/types/parcelas.types";
import type { ProductorListItem } from "../../productores/types/productores.types";
import type { AgronomistLookupItem } from "../../seguridad/types/security.types";
import { sectoresService } from "../../sectores/services/sectores.service";
import { subsectoresService } from "../../subsectores/services/subsectores.service";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated
} from "../../../shared/services";
import type {
  FieldsByStageCatalogs,
  FieldsByStageFilters,
  FieldsByStageReportData,
  ParcelsReportCatalogs,
  ParcelsReportData,
  ParcelsReportFilters,
  VisitReportFilters,
  VisitsReportCatalogs,
  VisitsReportData
} from "../types/reportes.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const reportesService = {
  async getVisitsReport(
    session: AuthSessionInput,
    filters: VisitReportFilters
  ): Promise<VisitsReportData> {
    const query = buildVisitReportQuery(filters);

    return apiRequest<VisitsReportData>(`/reportes/visitas?${query}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  async getVisitsCatalogs(session: AuthSessionInput): Promise<VisitsReportCatalogs> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const [agronomists, productores, parcelas] = await Promise.all([
      apiRequest<AgronomistLookupItem[]>("/usuarios/agronomos", { headers }),
      fetchAllPaginated<ProductorListItem>("/productores?activo=true", { headers }),
      fetchAllPaginated<ParcelaListItem>("/parcelas?activo=true", { headers })
    ]);

    return {
      agronomists: agronomists.sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "es")
      ),
      productores: productores.sort((left, right) =>
        buildProductorLabel(left).localeCompare(buildProductorLabel(right), "es")
      ),
      parcelas
    };
  },

  async getFieldsByStageReport(
    session: AuthSessionInput,
    filters: FieldsByStageFilters
  ): Promise<FieldsByStageReportData> {
    const query = buildFieldsByStageReportQuery(filters);
    const suffix = query ? `?${query}` : "";

    return apiRequest<FieldsByStageReportData>(`/reportes/campos-por-etapas${suffix}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  async getFieldsByStageCatalogs(
    session: AuthSessionInput
  ): Promise<FieldsByStageCatalogs> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const [agronomists, productores] = await Promise.all([
      apiRequest<AgronomistLookupItem[]>("/usuarios/agronomos", { headers }),
      fetchAllPaginated<ProductorListItem>("/productores?activo=true", { headers })
    ]);

    return {
      agronomists: agronomists.sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "es")
      ),
      productores: productores.sort((left, right) =>
        buildProductorLabel(left).localeCompare(buildProductorLabel(right), "es")
      )
    };
  },

  async getParcelsReport(
    session: AuthSessionInput,
    filters: ParcelsReportFilters
  ): Promise<ParcelsReportData> {
    const query = buildParcelsReportQuery(filters);
    const suffix = query ? `?${query}` : "";

    return apiRequest<ParcelsReportData>(`/reportes/parcelas${suffix}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  async getParcelsReportCatalogs(
    session: AuthSessionInput
  ): Promise<ParcelsReportCatalogs> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const [agronomists, productores, sectores, subsectores] = await Promise.all([
      apiRequest<AgronomistLookupItem[]>("/usuarios/agronomos", { headers }),
      fetchAllPaginated<ProductorListItem>("/productores", { headers }),
      sectoresService.getAll(session),
      subsectoresService.getAll(session)
    ]);

    return {
      agronomists: agronomists.sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "es")
      ),
      productores: productores.sort((left, right) =>
        buildProductorLabel(left).localeCompare(buildProductorLabel(right), "es")
      ),
      sectores: sectores.sort((left, right) => left.name.localeCompare(right.name, "es")),
      subsectores: subsectores.sort((left, right) =>
        left.name.localeCompare(right.name, "es")
      )
    };
  }
};

export function buildParcelsReportQuery(filters: ParcelsReportFilters) {
  const searchParams = new URLSearchParams();
  const optionalIds = [
    ["agronomo_usuario_id", filters.agronomistUserId],
    ["productor_id", filters.productorId],
    ["sector_id", filters.sectorId],
    ["subsector_id", filters.subsectorId]
  ] as const;

  for (const [key, value] of optionalIds) {
    if (value) searchParams.set(key, value);
  }
  if (filters.status) searchParams.set("activo", filters.status);

  return searchParams.toString();
}

export function buildFieldsByStageReportQuery(filters: FieldsByStageFilters) {
  const searchParams = new URLSearchParams();

  if (filters.agronomistUserId) {
    searchParams.set("agronomo_usuario_id", filters.agronomistUserId);
  }

  if (filters.productorId) {
    searchParams.set("productor_id", filters.productorId);
  }

  return searchParams.toString();
}

export function buildVisitReportQuery(filters: VisitReportFilters) {
  const searchParams = new URLSearchParams();
  searchParams.set("fecha_desde", filters.startDate);
  searchParams.set("fecha_hasta", filters.endDate);

  if (filters.agronomistUserId) {
    searchParams.set("agronomo_usuario_id", filters.agronomistUserId);
  }

  if (filters.productorId) {
    searchParams.set("productor_id", filters.productorId);
  }

  return searchParams.toString();
}

export function buildProductorLabel(productor: ProductorListItem) {
  return (
    [productor.firstName, productor.lastName].filter(Boolean).join(" ").trim() ||
    productor.documentNumber ||
    `Productor #${productor.id}`
  );
}
