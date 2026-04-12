import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  apiRequestEnvelope,
  createAuthHeaders
} from "../../../shared/services";
import type { DashboardSummary } from "../types/dashboard.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

type ParcelasSummaryResponse = {
  totals: {
    parcelasCount: number;
    totalAreaHectares: string;
  };
};

export const dashboardService = {
  async getSummary(session: AuthSessionInput): Promise<DashboardSummary> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);

    // These endpoints are paginated; we only need totals for the dashboard,
    // so request the minimum page size and read meta.total below.
    const [visitasResponse, productoresResponse, parcelasSummary, campaniasResponse] =
      await Promise.all([
        apiRequestEnvelope<unknown[]>("/visitas-campo?activo=true&limit=1", {
          headers
        }),
        apiRequestEnvelope<unknown[]>("/productores?limit=1", { headers }),
        apiRequest<ParcelasSummaryResponse>("/parcelas/resumen?activo=true", {
          headers
        }),
        apiRequestEnvelope<unknown[]>("/campanias?activa=true", { headers })
      ]);

    return {
      activeVisitsCount: readCount(visitasResponse.meta, visitasResponse.data.length),
      productoresCount: readCount(
        productoresResponse.meta,
        productoresResponse.data.length
      ),
      activeParcelasCount: parcelasSummary.totals.parcelasCount,
      activeCampaniasCount: readCount(
        campaniasResponse.meta,
        campaniasResponse.data.length
      )
    };
  }
};

function readCount(
  meta: Record<string, unknown> | undefined,
  fallback: number
) {
  // Paginated endpoints return meta.total; unpaginated endpoints return meta.count.
  const rawTotal = meta?.total;

  if (typeof rawTotal === "number") {
    return rawTotal;
  }

  const rawCount = meta?.count;

  if (typeof rawCount === "number") {
    return rawCount;
  }

  return fallback;
}
