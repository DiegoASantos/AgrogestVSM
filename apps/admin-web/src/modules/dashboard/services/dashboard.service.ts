import { apiRequest, createAuthHeaders } from "../../../shared/services";
import type { AuthSession } from "../../auth/types/auth.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;
import type {
  DashboardDateRange,
  DashboardPeriodFilters,
  DashboardResumen,
  ParcelasPorEtapa,
  VisitasPorAgronomo
} from "../types/dashboard.types";

export const dashboardService = {
  async getResumen(
    session: AuthSessionInput,
    filters: DashboardPeriodFilters
  ): Promise<DashboardResumen> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const params = buildDashboardPeriodQuery(filters);

    return apiRequest<DashboardResumen>(`/dashboard/resumen?${params}`, {
      headers
    });
  },

  async getVisitasPorAgronomo(
    session: AuthSessionInput,
    filters: DashboardDateRange
  ): Promise<{ items: VisitasPorAgronomo[] }> {
    return apiRequest<{ items: VisitasPorAgronomo[] }>(
      `/dashboard/visitas-por-agronomo?${buildDateRangeQuery(filters)}`,
      { headers: createAuthHeaders(session.accessToken, session.tokenType) }
    );
  },

  async getParcelasPorEtapa(
    session: AuthSessionInput,
    filters: DashboardDateRange
  ): Promise<{ items: ParcelasPorEtapa[] }> {
    return apiRequest<{ items: ParcelasPorEtapa[] }>(
      `/dashboard/parcelas-por-etapa?${buildDateRangeQuery(filters)}`,
      {
        headers: createAuthHeaders(session.accessToken, session.tokenType)
      }
    );
  }
};

function buildDateRangeQuery(filters: DashboardDateRange) {
  const searchParams = new URLSearchParams();
  searchParams.set("fecha_desde", filters.startDate);
  searchParams.set("fecha_hasta", filters.endDate);
  return searchParams.toString();
}

export function buildDashboardPeriodQuery(filters: DashboardPeriodFilters) {
  const searchParams = new URLSearchParams();
  searchParams.set("year", String(filters.year));
  if (filters.month !== null) searchParams.set("month", String(filters.month));
  if (filters.day !== null) searchParams.set("day", String(filters.day));
  return searchParams.toString();
}
