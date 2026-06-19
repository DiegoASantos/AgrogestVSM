import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  apiRequestEnvelope,
  createAuthHeaders,
  fetchAllPaginated,
  type ApiSuccessResponse
} from "../../../shared/services";
import type {
  AgronomistFilterOption,
  CampaignLookupItem,
  CropLookupItem,
  IncidenceLevelLookupItem,
  VisitaLaborCultural,
  ParcelaLookupItem,
  ParcelasVisitadasPorAgronomoResponse,
  ParcelaVisitadaPorAgronomo,
  ParcelaVisitasHistory,
  PestDiseaseLookupItem,
  PhenologicalStageLookupItem,
  ProductorVisitasHistory,
  VarietyLookupItem,
  VisitaCampo,
  VisitaDetailData,
  VisitaEvaluacion,
  VisitaFilterCatalogs,
  VisitaListFilters,
  VisitaListResponse,
  VisitaObservacionSanitaria,
  VisitaRiego
} from "../types/visitas.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

type ProductorApiItem = {
  id: string;
  documentNumber: string;
  email: string | null;
  publicId: string;
};

type CampaniaApiItem = {
  id: string;
  name: string;
  cultivoId: string;
  startDate: string;
  endDate: string;
};

type ParcelaApiItem = {
  id: string;
  sectorId: string;
  code: string;
  name: string | null;
};

type UserApiItem = {
  id: string;
  displayName: string;
  email: string;
  isActive: boolean;
};

type SectorApiItem = {
  id: string;
  name: string;
};

type FullDetailApiResponse = {
  visita: VisitaCampo;
  evaluaciones: VisitaEvaluacion[];
  observacionesSanitarias: VisitaObservacionSanitaria[];
  riego: VisitaRiego | null;
  laboresCulturales: VisitaLaborCultural[];
};

export const visitasService = {
  async getList(
    session: AuthSessionInput,
    filters: VisitaListFilters
  ): Promise<VisitaListResponse> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const query = buildQueryString(filters);
    const path = query ? `/visitas-campo?${query}` : "/visitas-campo";
    const response = await apiRequestEnvelope<VisitaCampo[]>(path, { headers });

    return {
      items: response.data,
      count: readCount(response, response.data.length)
    };
  },

  async getFilterCatalogs(session: AuthSessionInput): Promise<VisitaFilterCatalogs> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    // productores, parcelas and campanias are paginated; fetch all pages so the
    // filter dropdowns are complete. usuarios is capped server-side.
    const [productores, campanias, parcelas, agronomos] = await Promise.all([
      fetchAllPaginated<ProductorApiItem>("/productores", { headers }),
      fetchAllPaginated<CampaniaApiItem>("/campanias", { headers }),
      fetchAllPaginated<ParcelaApiItem>("/parcelas", { headers }),
      safeRequestList<UserApiItem>(session, "/usuarios")
    ]);

    return {
      productores: productores.map((productor) => ({
        id: productor.id,
        label: buildProductorLabel(productor)
      })),
      campanias: campanias.map((campania) => ({
        id: campania.id,
        label: campania.name
      })),
      parcelas: parcelas.map((parcela) => ({
        id: parcela.id,
        label: buildParcelaLabel(parcela)
      })),
      agronomos: buildAgronomistOptions(agronomos)
    };
  },

  async getFullDetail(
    session: AuthSessionInput,
    id: string
  ): Promise<VisitaDetailData> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const detail = await apiRequest<FullDetailApiResponse>(
      `/visitas-campo/${id}/detalle-completo`,
      {
        headers
      }
    );

    const [agronomist, crop, variety, parcela, campaign, phenologicalStage] =
      await Promise.all([
        safeRequest<UserApiItem>(session, `/usuarios/${detail.visita.agronomistUserId}`),
        safeRequest<CropLookupItem>(session, `/cultivos/${detail.visita.cropId}`),
        safeRequest<VarietyLookupItem>(session, `/variedades/${detail.visita.varietyId}`),
        safeRequest<ParcelaLookupItem>(session, `/parcelas/${detail.visita.parcelaId}`),
        safeRequest<CampaignLookupItem>(session, `/campanias/${detail.visita.campaignId}`),
        detail.visita.phenologicalStageId
          ? safeRequest<PhenologicalStageLookupItem>(
              session,
              `/etapas-fenologicas/${detail.visita.phenologicalStageId}`
            )
          : Promise.resolve(null)
      ]);

    const [pestDiseases, incidenceLevels] = await Promise.all([
      safeRequestAll<PestDiseaseLookupItem>(session, "/plagas-enfermedades"),
      safeRequestAll<IncidenceLevelLookupItem>(
        session,
        "/niveles-incidencia-severidad"
      )
    ]);

    return {
      ...detail,
      lookups: {
        agronomist: agronomist ? { id: agronomist.id, name: agronomist.displayName } : null,
        crop,
        variety,
        parcela,
        campaign,
        phenologicalStage,
        pestDiseases,
        incidenceLevels
      }
    };
  },

  async getHistoryByProductor(
    session: AuthSessionInput,
    productorId: string,
    filters: Pick<
      VisitaListFilters,
      "campaignId" | "agronomistUserId" | "startDate" | "endDate"
    >
  ): Promise<ProductorVisitasHistory> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const query = buildHistoryQueryString(filters);
    const path = query
      ? `/productores/${productorId}/historial-visitas?${query}`
      : `/productores/${productorId}/historial-visitas`;
    const response = await apiRequestEnvelope<{
      productor: ProductorVisitasHistory["productor"];
      filters: ProductorVisitasHistory["filters"];
      visitas: VisitaCampo[];
    }>(path, {
      headers
    });

    return {
      ...response.data,
      count: readCount(response, response.data.visitas.length)
    };
  },

  async getParcelasVisitadasByAgronomo(
    session: AuthSessionInput,
    agronomistUserId: string,
    agronomistLabel: string
  ): Promise<ParcelasVisitadasPorAgronomoResponse> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const path = `/visitas-campo?agronomo_usuario_id=${encodeURIComponent(
      agronomistUserId
    )}`;
    const [visitas, parcelas] = await Promise.all([
      fetchAllPaginated<VisitaCampo>(path, { headers }),
      fetchAllPaginated<ParcelaApiItem>("/parcelas", { headers })
    ]);

    const parcelaLabels = new Map(
      parcelas.map((parcela) => [parcela.id, buildParcelaLabel(parcela)])
    );

    const grouped = new Map<string, ParcelaVisitadaPorAgronomo>();

    for (const visita of visitas) {
      const existing = grouped.get(visita.parcelaId);

      if (existing) {
        existing.visitCount += 1;

        if (visita.visitDate > existing.lastVisitDate) {
          existing.lastVisitDate = visita.visitDate;
        }

        if (visita.visitDate < existing.firstVisitDate) {
          existing.firstVisitDate = visita.visitDate;
        }

        continue;
      }

      grouped.set(visita.parcelaId, {
        parcelaId: visita.parcelaId,
        parcelaLabel:
          parcelaLabels.get(visita.parcelaId) ?? `Parcela #${visita.parcelaId}`,
        visitCount: 1,
        firstVisitDate: visita.visitDate,
        lastVisitDate: visita.visitDate
      });
    }

    const sortedParcelas = [...grouped.values()].sort((leftParcela, rightParcela) =>
      rightParcela.lastVisitDate.localeCompare(leftParcela.lastVisitDate)
    );

    return {
      agronomistUserId,
      agronomistLabel,
      parcelas: sortedParcelas,
      totalVisitas: visitas.length
    };
  },

  async getHistoryByParcela(
    session: AuthSessionInput,
    parcelaId: string
  ): Promise<ParcelaVisitasHistory> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    const response = await apiRequestEnvelope<{
      parcela: ParcelaVisitasHistory["parcela"];
      visitas: VisitaCampo[];
    }>(`/parcelas/${parcelaId}/historial-visitas`, {
      headers
    });
    const sector = await safeRequest<SectorApiItem>(
      session,
      `/sectores/${response.data.parcela.sectorId}`
    );

    return {
      ...response.data,
      count: readCount(response, response.data.visitas.length),
      lookups: {
        sector: sector ? { id: sector.id, name: sector.name } : null
      }
    };
  }
};

function buildQueryString(filters: VisitaListFilters) {
  const searchParams = new URLSearchParams();

  appendQueryParam(searchParams, "agronomo_usuario_id", filters.agronomistUserId);
  appendQueryParam(searchParams, "productor_id", filters.productorId);
  appendQueryParam(searchParams, "campania_id", filters.campaignId);
  appendQueryParam(searchParams, "parcela_id", filters.parcelaId);
  appendQueryParam(searchParams, "fecha_desde", filters.startDate);
  appendQueryParam(searchParams, "fecha_hasta", filters.endDate);

  return searchParams.toString();
}

function buildHistoryQueryString(
  filters: Pick<
    VisitaListFilters,
    "campaignId" | "agronomistUserId" | "startDate" | "endDate"
  >
) {
  const searchParams = new URLSearchParams();

  appendQueryParam(searchParams, "campania_id", filters.campaignId);
  appendQueryParam(searchParams, "agronomo_usuario_id", filters.agronomistUserId);
  appendQueryParam(searchParams, "fecha_desde", filters.startDate);
  appendQueryParam(searchParams, "fecha_hasta", filters.endDate);

  return searchParams.toString();
}

function appendQueryParam(
  searchParams: URLSearchParams,
  key: string,
  value: string
) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return;
  }

  searchParams.set(key, normalizedValue);
}

function readCount<T>(response: ApiSuccessResponse<T>, fallback: number) {
  // Paginated endpoints return meta.total; unpaginated endpoints return meta.count.
  const rawTotal = response.meta?.total;

  if (typeof rawTotal === "number") {
    return rawTotal;
  }

  const rawCount = response.meta?.count;

  if (typeof rawCount === "number") {
    return rawCount;
  }

  return fallback;
}

function buildProductorLabel(productor: ProductorApiItem): string {
  if (productor.email) {
    return `${productor.documentNumber} - ${productor.email}`;
  }

  return `${productor.documentNumber} - ${productor.publicId}`;
}

function buildParcelaLabel(parcela: ParcelaApiItem): string {
  if (parcela.name) {
    return `${parcela.code} - ${parcela.name}`;
  }

  return parcela.code;
}

function buildAgronomistOptions(users: UserApiItem[]): AgronomistFilterOption[] {
  return [...users]
    .filter((user) => user.isActive)
    .sort((leftUser, rightUser) =>
      leftUser.displayName.localeCompare(rightUser.displayName, "es")
    )
    .map((user) => ({
      id: user.id,
      label: buildAgronomistLabel(user)
    }));
}

function buildAgronomistLabel(user: UserApiItem) {
  const displayName = user.displayName.trim();

  if (displayName && displayName.toLowerCase() !== user.email.toLowerCase()) {
    return `${displayName} (${user.email})`;
  }

  return user.email;
}

async function safeRequest<T>(
  session: AuthSessionInput,
  path: string
): Promise<T | null> {
  try {
    return await apiRequest<T>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  } catch {
    return null;
  }
}

async function safeRequestList<T>(
  session: AuthSessionInput,
  path: string
): Promise<T[]> {
  try {
    return await apiRequest<T[]>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  } catch {
    return [];
  }
}

async function safeRequestAll<T>(
  session: AuthSessionInput,
  path: string
): Promise<T[]> {
  try {
    return await fetchAllPaginated<T>(path, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  } catch {
    return [];
  }
}
