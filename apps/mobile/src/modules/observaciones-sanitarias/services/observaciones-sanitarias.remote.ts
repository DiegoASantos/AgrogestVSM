import { apiRequest } from "../../../shared/services";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseStageLevelCatalogItem,
  PestDiseaseCatalogItem,
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../types";

type CreateObservacionSanitariaInput = {
  pestDiseaseId: string;
  incidenceLevelId?: number | null;
  severityLevelId?: number | null;
  observation?: string;
};

type UpdateObservacionSanitariaInput = {
  pestDiseaseId?: string;
  incidenceLevelId?: number | null;
  severityLevelId?: number | null;
  observation?: string | null;
};

type UpsertStepNoteInput = {
  observation?: string | null;
  recommendation?: string | null;
};

export const observacionesSanitariasRemote = {
  getPestDiseases() {
    return fetchAllPaginated<PestDiseaseCatalogItem>("/plagas-enfermedades");
  },

  getIncidenceLevels() {
    return fetchAllPaginated<IncidenceLevelCatalogItem>(
      "/niveles-incidencia-severidad"
    );
  },

  getPestDiseaseStageLevels() {
    return fetchAllPaginated<PestDiseaseStageLevelCatalogItem>(
      "/plagas-enfermedades-etapas-niveles"
    );
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaObservacionSanitaria[]>(
      `/visitas-campo/${visitaId}/observaciones-sanitarias`
    );
  },

  create(visitaId: string, input: CreateObservacionSanitariaInput) {
    return apiRequest<VisitaObservacionSanitaria>(
      `/visitas-campo/${visitaId}/observaciones-sanitarias`,
      {
        method: "POST",
        body: input
      }
    );
  },

  update(id: string, input: UpdateObservacionSanitariaInput) {
    return apiRequest<VisitaObservacionSanitaria>(
      `/observaciones-sanitarias/${id}`,
      {
        method: "PATCH",
        body: input
      }
    );
  },

  remove(id: string) {
    return apiRequest<VisitaObservacionSanitaria>(
      `/observaciones-sanitarias/${id}`,
      {
        method: "DELETE"
      }
    );
  },

  upsertStepNote(
    visitaId: string,
    stepNumber: number,
    input: UpsertStepNoteInput
  ) {
    return apiRequest<VisitaStepNote>(
      `/visitas-campo/${visitaId}/paso-observaciones/${stepNumber}`,
      {
        method: "PATCH",
        body: input
      }
    );
  }
};

async function fetchAllPaginated<T>(path: string): Promise<T[]> {
  const collected: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  const pageSize = 200;

  for (let page = 1; page <= 25; page += 1) {
    const items = await apiRequest<T[]>(
      `${path}${separator}page=${page}&limit=${pageSize}`
    );

    collected.push(...items);

    if (items.length < pageSize) {
      break;
    }
  }

  return collected;
}
