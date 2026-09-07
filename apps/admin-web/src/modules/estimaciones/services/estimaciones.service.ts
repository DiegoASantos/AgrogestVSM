import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";
import type { EstimationWeekData, SaveWeekEstimate } from "../types/estimaciones.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const estimacionesService = {
  getWeek(session: AuthSessionInput, date: string) {
    return apiRequest<EstimationWeekData>(`/estimaciones/semanas/${date}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  saveWeek(session: AuthSessionInput, date: string, estimaciones: SaveWeekEstimate[]) {
    return apiRequest<EstimationWeekData>(`/estimaciones/semanas/${date}`, {
      method: "PUT",
      headers: createAuthHeaders(session.accessToken, session.tokenType),
      body: { estimaciones }
    });
  }
};
