import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";
import type {
  DepartamentoListItem,
  DistritoListItem,
  ProvinciaListItem
} from "../types/geografias.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const geografiasService = {
  getDepartamentos(session: AuthSessionInput) {
    return apiRequest<DepartamentoListItem[]>("/geografias/departamentos", {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  getProvincias(session: AuthSessionInput, departamentoId: string) {
    return apiRequest<ProvinciaListItem[]>(
      `/geografias/departamentos/${departamentoId}/provincias`,
      { headers: createAuthHeaders(session.accessToken, session.tokenType) }
    );
  },

  getDistritos(session: AuthSessionInput) {
    return apiRequest<DistritoListItem[]>("/geografias/distritos", {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  }
};
