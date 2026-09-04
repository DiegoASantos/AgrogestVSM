import type { AuthSession } from "../../auth/types/auth.types";
import type { ParcelaListItem } from "../../parcelas/types/parcelas.types";
import type { ProductorListItem } from "../../productores/types/productores.types";
import type { AgronomistLookupItem } from "../../seguridad/types/security.types";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated
} from "../../../shared/services";
import type {
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
  }
};

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
