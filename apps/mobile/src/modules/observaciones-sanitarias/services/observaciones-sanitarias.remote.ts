import { apiRequest } from "../../../shared/services";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseCatalogItem,
  VisitaObservacionSanitaria
} from "../types";

type CreateObservacionSanitariaInput = {
  pestDiseaseId: string;
  incidenceLevelId?: number | null;
  observation?: string;
};

type UpdateObservacionSanitariaInput = {
  pestDiseaseId?: string;
  incidenceLevelId?: number | null;
  observation?: string | null;
};

export const observacionesSanitariasRemote = {
  getPestDiseases() {
    return apiRequest<PestDiseaseCatalogItem[]>("/plagas-enfermedades");
  },

  getIncidenceLevels() {
    return apiRequest<IncidenceLevelCatalogItem[]>(
      "/niveles-incidencia-severidad"
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
  }
};
