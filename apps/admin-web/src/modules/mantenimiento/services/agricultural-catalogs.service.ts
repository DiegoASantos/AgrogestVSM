import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  createAuthHeaders,
  type ApiRequestOptions
} from "../../../shared/services";
import type {
  CampaniaCatalogItem,
  CampaniaCatalogPayload,
  CatalogOption,
  CultivoCatalogItem,
  CultivoCatalogPayload,
  EtapaFenologicaCatalogItem,
  EtapaFenologicaCatalogPayload,
  NivelIncidenciaCatalogItem,
  NivelIncidenciaCatalogPayload,
  PlagaEnfermedadCatalogItem,
  PlagaEnfermedadCatalogPayload,
  TipoDocumentoCatalogItem,
  TipoDocumentoCatalogPayload
} from "../types/agricultural-catalogs.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

type CultivoApiItem = {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
};

type CampaniaApiItem = {
  id: string;
  name: string;
  cultivoId: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type EtapaFenologicaApiItem = {
  id: string;
  cultivoId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

type NivelIncidenciaApiItem = {
  id: number;
  name: string;
  sortOrder: number;
};

type PlagaEnfermedadApiItem = {
  id: string;
  code: string | null;
  name: string;
  type: "plaga" | "enfermedad";
  isActive: boolean;
};

type TipoDocumentoApiItem = {
  id: number;
  code: string;
  name: string;
};

export const agriculturalCatalogsService = {
  async getCultivos(session: AuthSessionInput): Promise<CultivoCatalogItem[]> {
    const items = await request<CultivoApiItem[]>(session, "/cultivos");

    return items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      isActive: item.isActive
    }));
  },

  async createCultivo(
    session: AuthSessionInput,
    payload: CultivoCatalogPayload
  ): Promise<CultivoCatalogItem> {
    const item = await request<CultivoApiItem>(session, "/cultivos", {
      method: "POST",
      body: payload
    });

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      isActive: item.isActive
    };
  },

  async updateCultivo(
    session: AuthSessionInput,
    id: string,
    payload: CultivoCatalogPayload
  ): Promise<CultivoCatalogItem> {
    const item = await request<CultivoApiItem>(session, `/cultivos/${id}`, {
      method: "PATCH",
      body: payload
    });

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      isActive: item.isActive
    };
  },

  async deleteCultivo(session: AuthSessionInput, id: string) {
    return request<CultivoApiItem>(session, `/cultivos/${id}`, {
      method: "DELETE"
    });
  },

  async getCampanias(
    session: AuthSessionInput
  ): Promise<CampaniaCatalogItem[]> {
    const items = await request<CampaniaApiItem[]>(session, "/campanias");

    return items.map(mapCampaniaItem);
  },

  async createCampania(
    session: AuthSessionInput,
    payload: CampaniaCatalogPayload
  ): Promise<CampaniaCatalogItem> {
    const item = await request<CampaniaApiItem>(session, "/campanias", {
      method: "POST",
      body: payload
    });

    return mapCampaniaItem(item);
  },

  async updateCampania(
    session: AuthSessionInput,
    id: string,
    payload: CampaniaCatalogPayload
  ): Promise<CampaniaCatalogItem> {
    const item = await request<CampaniaApiItem>(session, `/campanias/${id}`, {
      method: "PATCH",
      body: payload
    });

    return mapCampaniaItem(item);
  },

  async deleteCampania(session: AuthSessionInput, id: string) {
    return request<CampaniaApiItem>(session, `/campanias/${id}`, {
      method: "DELETE"
    });
  },

  async getEtapasFenologicas(
    session: AuthSessionInput
  ): Promise<EtapaFenologicaCatalogItem[]> {
    const items = await request<EtapaFenologicaApiItem[]>(
      session,
      "/etapas-fenologicas"
    );

    return items.map((item) => ({
      id: item.id,
      cultivoId: item.cultivoId,
      name: item.name,
      description: item.description,
      isActive: item.isActive
    }));
  },

  async createEtapaFenologica(
    session: AuthSessionInput,
    payload: EtapaFenologicaCatalogPayload
  ): Promise<EtapaFenologicaCatalogItem> {
    const item = await request<EtapaFenologicaApiItem>(
      session,
      "/etapas-fenologicas",
      {
        method: "POST",
        body: payload
      }
    );

    return {
      id: item.id,
      cultivoId: item.cultivoId,
      name: item.name,
      description: item.description,
      isActive: item.isActive
    };
  },

  async updateEtapaFenologica(
    session: AuthSessionInput,
    id: string,
    payload: EtapaFenologicaCatalogPayload
  ): Promise<EtapaFenologicaCatalogItem> {
    const item = await request<EtapaFenologicaApiItem>(
      session,
      `/etapas-fenologicas/${id}`,
      {
        method: "PATCH",
        body: payload
      }
    );

    return {
      id: item.id,
      cultivoId: item.cultivoId,
      name: item.name,
      description: item.description,
      isActive: item.isActive
    };
  },

  async deleteEtapaFenologica(session: AuthSessionInput, id: string) {
    return request<EtapaFenologicaApiItem>(session, `/etapas-fenologicas/${id}`, {
      method: "DELETE"
    });
  },

  async getNivelesIncidencia(
    session: AuthSessionInput
  ): Promise<NivelIncidenciaCatalogItem[]> {
    const items = await request<NivelIncidenciaApiItem[]>(
      session,
      "/niveles-incidencia"
    );

    return items.map((item) => ({
      id: String(item.id),
      name: item.name,
      sortOrder: item.sortOrder
    }));
  },

  async createNivelIncidencia(
    session: AuthSessionInput,
    payload: NivelIncidenciaCatalogPayload
  ): Promise<NivelIncidenciaCatalogItem> {
    const item = await request<NivelIncidenciaApiItem>(
      session,
      "/niveles-incidencia",
      {
        method: "POST",
        body: payload
      }
    );

    return {
      id: String(item.id),
      name: item.name,
      sortOrder: item.sortOrder
    };
  },

  async updateNivelIncidencia(
    session: AuthSessionInput,
    id: string,
    payload: NivelIncidenciaCatalogPayload
  ): Promise<NivelIncidenciaCatalogItem> {
    const item = await request<NivelIncidenciaApiItem>(
      session,
      `/niveles-incidencia/${id}`,
      {
        method: "PATCH",
        body: payload
      }
    );

    return {
      id: String(item.id),
      name: item.name,
      sortOrder: item.sortOrder
    };
  },

  async deleteNivelIncidencia(session: AuthSessionInput, id: string) {
    return request<NivelIncidenciaApiItem>(session, `/niveles-incidencia/${id}`, {
      method: "DELETE"
    });
  },

  async getPlagasEnfermedades(
    session: AuthSessionInput
  ): Promise<PlagaEnfermedadCatalogItem[]> {
    const items = await request<PlagaEnfermedadApiItem[]>(
      session,
      "/plagas-enfermedades"
    );

    return items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      isActive: item.isActive
    }));
  },

  async createPlagaEnfermedad(
    session: AuthSessionInput,
    payload: PlagaEnfermedadCatalogPayload
  ): Promise<PlagaEnfermedadCatalogItem> {
    const item = await request<PlagaEnfermedadApiItem>(
      session,
      "/plagas-enfermedades",
      {
        method: "POST",
        body: payload
      }
    );

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      isActive: item.isActive
    };
  },

  async updatePlagaEnfermedad(
    session: AuthSessionInput,
    id: string,
    payload: PlagaEnfermedadCatalogPayload
  ): Promise<PlagaEnfermedadCatalogItem> {
    const item = await request<PlagaEnfermedadApiItem>(
      session,
      `/plagas-enfermedades/${id}`,
      {
        method: "PATCH",
        body: payload
      }
    );

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      isActive: item.isActive
    };
  },

  async deletePlagaEnfermedad(session: AuthSessionInput, id: string) {
    return request<PlagaEnfermedadApiItem>(session, `/plagas-enfermedades/${id}`, {
      method: "DELETE"
    });
  },

  async getTiposDocumento(
    session: AuthSessionInput
  ): Promise<TipoDocumentoCatalogItem[]> {
    const items = await request<TipoDocumentoApiItem[]>(
      session,
      "/tipos-documento"
    );

    return items.map((item) => ({
      id: String(item.id),
      code: item.code,
      name: item.name
    }));
  },

  async createTipoDocumento(
    session: AuthSessionInput,
    payload: TipoDocumentoCatalogPayload
  ): Promise<TipoDocumentoCatalogItem> {
    const item = await request<TipoDocumentoApiItem>(
      session,
      "/tipos-documento",
      {
        method: "POST",
        body: payload
      }
    );

    return {
      id: String(item.id),
      code: item.code,
      name: item.name
    };
  },

  async updateTipoDocumento(
    session: AuthSessionInput,
    id: string,
    payload: TipoDocumentoCatalogPayload
  ): Promise<TipoDocumentoCatalogItem> {
    const item = await request<TipoDocumentoApiItem>(
      session,
      `/tipos-documento/${id}`,
      {
        method: "PATCH",
        body: payload
      }
    );

    return {
      id: String(item.id),
      code: item.code,
      name: item.name
    };
  },

  async deleteTipoDocumento(session: AuthSessionInput, id: string) {
    return request<TipoDocumentoApiItem>(session, `/tipos-documento/${id}`, {
      method: "DELETE"
    });
  },

  async getCultivoOptions(
    session: AuthSessionInput
  ): Promise<CatalogOption[]> {
    const cultivos = await this.getCultivos(session);

    return cultivos.map((cultivo) => ({
      id: cultivo.id,
      label: cultivo.code ? `${cultivo.code} - ${cultivo.name}` : cultivo.name
    }));
  }
};

async function request<T>(
  session: AuthSessionInput,
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...createAuthHeaders(session.accessToken, session.tokenType),
      ...(options.headers ?? {})
    }
  });
}

function mapCampaniaItem(item: CampaniaApiItem): CampaniaCatalogItem {
  return {
    id: item.id,
    name: item.name,
    cultivoId: item.cultivoId,
    startDate: item.startDate,
    endDate: item.endDate,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}
