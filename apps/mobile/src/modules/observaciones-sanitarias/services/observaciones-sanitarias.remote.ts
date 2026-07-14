import {
  apiRequest,
  apiRequestAllPages,
  type ApiRequestContext
} from "../../../shared/services";
import type {
  IncidenceLevelCatalogItem,
  OrganoAfectado,
  PestDiseaseStageLevelCatalogItem,
  PestDiseaseCatalogItem,
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../types";

type CreateObservacionSanitariaInput = {
  pestDiseaseId: string;
  incidenceLevelId?: number | null;
  severityLevelId?: number | null;
  incidencePercentage?: number | null;
  observation?: string;
  organosAfectados: OrganoAfectado[];
};

type UpdateObservacionSanitariaInput = {
  pestDiseaseId?: string;
  incidenceLevelId?: number | null;
  severityLevelId?: number | null;
  incidencePercentage?: number | null;
  observation?: string | null;
  organosAfectados?: OrganoAfectado[];
};

type UpsertStepNoteInput = {
  observation?: string | null;
  recommendation?: string | null;
};

export const observacionesSanitariasRemote = {
  getPestDiseases() {
    return apiRequestAllPages<PestDiseaseCatalogItem>("/plagas-enfermedades");
  },

  getIncidenceLevels() {
    return apiRequestAllPages<IncidenceLevelCatalogItem>("/niveles-incidencia-severidad");
  },

  getPestDiseaseStageLevels() {
    return apiRequestAllPages<PestDiseaseStageLevelCatalogItem>(
      "/plagas-enfermedades-etapas-niveles"
    );
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaObservacionSanitaria[]>(
      `/visitas-campo/${visitaId}/observaciones-sanitarias`
    );
  },

  create(
    visitaId: string,
    input: CreateObservacionSanitariaInput,
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaObservacionSanitaria>(
      `/visitas-campo/${visitaId}/observaciones-sanitarias`,
      {
        method: "POST",
        body: input,
        ...context
      }
    );
  },

  update(
    id: string,
    input: UpdateObservacionSanitariaInput,
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaObservacionSanitaria>(`/observaciones-sanitarias/${id}`, {
      method: "PATCH",
      body: input,
      ...context
    });
  },

  remove(id: string, context: ApiRequestContext = {}) {
    return apiRequest<VisitaObservacionSanitaria>(`/observaciones-sanitarias/${id}`, {
      method: "DELETE",
      ...context
    });
  },

  upsertStepNote(
    visitaId: string,
    stepNumber: number,
    input: UpsertStepNoteInput,
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaStepNote>(
      `/visitas-campo/${visitaId}/paso-observaciones/${stepNumber}`,
      {
        method: "PATCH",
        body: input,
        ...context
      }
    );
  }
};
