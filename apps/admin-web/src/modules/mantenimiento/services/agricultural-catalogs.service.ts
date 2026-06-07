import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated,
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
  PlagaEnfermedadEtapaNivelCatalogItem,
  PlagaEnfermedadEtapaNivelCatalogPayload,
  PlagaEnfermedadCatalogItem,
  PlagaEnfermedadCatalogPayload,
  SubEtapaCatalogItem,
  SubEtapaCatalogPayload,
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
  sortOrder: number | null;
  type: "Etapa" | "Labor";
  isActive: boolean;
};

type SubEtapaApiItem = {
  id: string;
  etapaFenologicaId: string;
  name: string;
  sortOrder: number;
  description: string | null;
  percentage: number | null;
  isActive: boolean;
};

type NivelIncidenciaApiItem = {
  id: number;
  name: string;
  sortOrder: number;
  type: "incidencia" | "severidad";
};

type PlagaEnfermedadApiItem = {
  id: string;
  scientificName: string | null;
  name: string;
  type: "plaga" | "enfermedad";
  isActive: boolean;
};

type PlagaEnfermedadEtapaNivelApiItem = {
  id: string;
  plagaEnfermedadId: string;
  etapaFenologicaId: string;
  nivelIncidenciaSeveridadId: number;
  description: string | null;
  isActive: boolean;
};

type TipoDocumentoApiItem = {
  id: number;
  code: string;
  name: string;
};

export const agriculturalCatalogsService = {
  async getCultivos(session: AuthSessionInput): Promise<CultivoCatalogItem[]> {
    const items = await requestAll<CultivoApiItem>(session, "/cultivos");

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
    const items = await requestAll<CampaniaApiItem>(session, "/campanias");

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
    const items = await requestAll<EtapaFenologicaApiItem>(
      session,
      "/etapas-fenologicas"
    );

    return items.map((item) => ({
      id: item.id,
      cultivoId: item.cultivoId,
      name: item.name,
      description: item.description,
      sortOrder: item.sortOrder,
      type: item.type,
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
      sortOrder: item.sortOrder,
      type: item.type,
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
      sortOrder: item.sortOrder,
      type: item.type,
      isActive: item.isActive
    };
  },

  async deleteEtapaFenologica(session: AuthSessionInput, id: string) {
    return request<EtapaFenologicaApiItem>(session, `/etapas-fenologicas/${id}`, {
      method: "DELETE"
    });
  },

  async getSubEtapas(session: AuthSessionInput): Promise<SubEtapaCatalogItem[]> {
    const items = await requestAll<SubEtapaApiItem>(session, "/sub-etapas");

    return items.map(mapSubEtapaItem);
  },

  async createSubEtapa(
    session: AuthSessionInput,
    payload: SubEtapaCatalogPayload
  ): Promise<SubEtapaCatalogItem> {
    const item = await request<SubEtapaApiItem>(session, "/sub-etapas", {
      method: "POST",
      body: payload
    });

    return mapSubEtapaItem(item);
  },

  async updateSubEtapa(
    session: AuthSessionInput,
    id: string,
    payload: SubEtapaCatalogPayload
  ): Promise<SubEtapaCatalogItem> {
    const item = await request<SubEtapaApiItem>(session, `/sub-etapas/${id}`, {
      method: "PATCH",
      body: payload
    });

    return mapSubEtapaItem(item);
  },

  async deleteSubEtapa(session: AuthSessionInput, id: string) {
    return request<SubEtapaApiItem>(session, `/sub-etapas/${id}`, {
      method: "DELETE"
    });
  },

  async getNivelesIncidencia(
    session: AuthSessionInput
  ): Promise<NivelIncidenciaCatalogItem[]> {
    const items = await requestAll<NivelIncidenciaApiItem>(
      session,
      "/niveles-incidencia-severidad"
    );

    return items.map((item) => ({
      id: String(item.id),
      name: item.name,
      sortOrder: item.sortOrder,
      type: item.type
    }));
  },

  async createNivelIncidencia(
    session: AuthSessionInput,
    payload: NivelIncidenciaCatalogPayload
  ): Promise<NivelIncidenciaCatalogItem> {
    const item = await request<NivelIncidenciaApiItem>(
      session,
      "/niveles-incidencia-severidad",
      {
        method: "POST",
        body: payload
      }
    );

    return {
      id: String(item.id),
      name: item.name,
      sortOrder: item.sortOrder,
      type: item.type
    };
  },

  async updateNivelIncidencia(
    session: AuthSessionInput,
    id: string,
    payload: NivelIncidenciaCatalogPayload
  ): Promise<NivelIncidenciaCatalogItem> {
    const item = await request<NivelIncidenciaApiItem>(
      session,
      `/niveles-incidencia-severidad/${id}`,
      {
        method: "PATCH",
        body: payload
      }
    );

    return {
      id: String(item.id),
      name: item.name,
      sortOrder: item.sortOrder,
      type: item.type
    };
  },

  async deleteNivelIncidencia(session: AuthSessionInput, id: string) {
    return request<NivelIncidenciaApiItem>(
      session,
      `/niveles-incidencia-severidad/${id}`,
      {
        method: "DELETE"
      }
    );
  },

  async getPlagasEnfermedades(
    session: AuthSessionInput
  ): Promise<PlagaEnfermedadCatalogItem[]> {
    const items = await requestAll<PlagaEnfermedadApiItem>(
      session,
      "/plagas-enfermedades"
    );

    return items.map((item) => ({
      id: item.id,
      scientificName: item.scientificName,
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
      scientificName: item.scientificName,
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
      scientificName: item.scientificName,
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

  async getPlagasEnfermedadesEtapasNiveles(
    session: AuthSessionInput
  ): Promise<PlagaEnfermedadEtapaNivelCatalogItem[]> {
    const items = await requestAll<PlagaEnfermedadEtapaNivelApiItem>(
      session,
      "/plagas-enfermedades-etapas-niveles"
    );

    return items.map(mapPlagaEnfermedadEtapaNivelItem);
  },

  async createPlagaEnfermedadEtapaNivel(
    session: AuthSessionInput,
    payload: PlagaEnfermedadEtapaNivelCatalogPayload
  ): Promise<PlagaEnfermedadEtapaNivelCatalogItem> {
    const item = await request<PlagaEnfermedadEtapaNivelApiItem>(
      session,
      "/plagas-enfermedades-etapas-niveles",
      {
        method: "POST",
        body: {
          ...payload,
          nivelIncidenciaSeveridadId: Number(payload.nivelIncidenciaSeveridadId)
        }
      }
    );

    return mapPlagaEnfermedadEtapaNivelItem(item);
  },

  async updatePlagaEnfermedadEtapaNivel(
    session: AuthSessionInput,
    id: string,
    payload: PlagaEnfermedadEtapaNivelCatalogPayload
  ): Promise<PlagaEnfermedadEtapaNivelCatalogItem> {
    const item = await request<PlagaEnfermedadEtapaNivelApiItem>(
      session,
      `/plagas-enfermedades-etapas-niveles/${id}`,
      {
        method: "PATCH",
        body: {
          ...payload,
          nivelIncidenciaSeveridadId: Number(payload.nivelIncidenciaSeveridadId)
        }
      }
    );

    return mapPlagaEnfermedadEtapaNivelItem(item);
  },

  async deletePlagaEnfermedadEtapaNivel(session: AuthSessionInput, id: string) {
    return request<PlagaEnfermedadEtapaNivelApiItem>(
      session,
      `/plagas-enfermedades-etapas-niveles/${id}`,
      {
        method: "DELETE"
      }
    );
  },

  async getTiposDocumento(
    session: AuthSessionInput
  ): Promise<TipoDocumentoCatalogItem[]> {
    const items = await requestAll<TipoDocumentoApiItem>(
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
  },

  async getEtapaFenologicaOptions(
    session: AuthSessionInput
  ): Promise<CatalogOption[]> {
    const etapasFenologicas = await this.getEtapasFenologicas(session);

    return etapasFenologicas.map((etapaFenologica) => ({
      id: etapaFenologica.id,
      label:
        etapaFenologica.sortOrder === null
          ? etapaFenologica.name
          : `${etapaFenologica.sortOrder} - ${etapaFenologica.name}`
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

async function requestAll<T>(
  session: AuthSessionInput,
  path: string
): Promise<T[]> {
  return fetchAllPaginated<T>(path, {
    headers: createAuthHeaders(session.accessToken, session.tokenType)
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

function mapSubEtapaItem(item: SubEtapaApiItem): SubEtapaCatalogItem {
  return {
    id: item.id,
    etapaFenologicaId: item.etapaFenologicaId,
    name: item.name,
    sortOrder: item.sortOrder,
    description: item.description,
    percentage: item.percentage,
    isActive: item.isActive
  };
}

function mapPlagaEnfermedadEtapaNivelItem(
  item: PlagaEnfermedadEtapaNivelApiItem
): PlagaEnfermedadEtapaNivelCatalogItem {
  return {
    id: item.id,
    plagaEnfermedadId: item.plagaEnfermedadId,
    etapaFenologicaId: item.etapaFenologicaId,
    nivelIncidenciaSeveridadId: String(item.nivelIncidenciaSeveridadId),
    description: item.description,
    isActive: item.isActive
  };
}
