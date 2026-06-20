import { apiRequest, createAuthHeaders } from "../../../shared/services";
import type { AuthSession } from "../../auth/types/auth.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;
import type { DashboardResumen } from "../types/dashboard.types";

export const dashboardService = {
  async getResumen(
    session: AuthSessionInput,
    year?: number
  ): Promise<DashboardResumen> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const params = year ? `?year=${year}` : "";

    return apiRequest<DashboardResumen>(`/dashboard/resumen${params}`, {
      headers
    });
  }
};
