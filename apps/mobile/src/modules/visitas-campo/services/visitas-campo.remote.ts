import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import { getUserIdFromAccessToken } from "../../../shared/utils/auth-token";
import type { CreateVisitaCampoDraft, VisitaCampo, VisitaCampoFull } from "../types";

type AuthToken = {
  accessToken: string;
  tokenType?: string | null;
};

export const visitasCampoRemote = {
  create(
    draft: CreateVisitaCampoDraft,
    authToken: AuthToken,
    context: ApiRequestContext = {}
  ) {
    const agronomistUserId = getUserIdFromAccessToken(authToken.accessToken);

    return apiRequest<VisitaCampo>("/visitas-campo", {
      method: "POST",
      headers: {
        Authorization: `${authToken.tokenType ?? "Bearer"} ${authToken.accessToken}`
      },
      body: {
        ...draft,
        agronomistUserId
      },
      ...context
    });
  },

  update(
    id: string,
    draft: Omit<CreateVisitaCampoDraft, "publicId">,
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaCampo>(`/visitas-campo/${id}`, {
      method: "PATCH",
      body: draft,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<VisitaCampo>(`/visitas-campo/${id}`, {
      method: "DELETE",
      ...context
    });
  },

  getById(id: string) {
    return apiRequest<VisitaCampo>(`/visitas-campo/${id}`);
  },

  getFullDetail(id: string) {
    return apiRequest<VisitaCampoFull>(`/visitas-campo/${id}/detalle-completo`);
  }
};
