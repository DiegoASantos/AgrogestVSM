import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiDownload,
  apiRequest,
  apiRequestEnvelope,
  createAuthHeaders
} from "../../../shared/services";

type Session = Pick<AuthSession, "accessToken" | "tokenType">;
export type TipoVisitaFiltro = "GENERAL" | "TECNICA" | "COMERCIAL";
export type VisitaComercial = {
  id: string;
  publicId: string;
  tipoVisita: "COMERCIAL";
  tipoSujeto: "PERSONA" | "FUNDO" | "ASOCIATIVA" | "COOPERATIVA" | "RECORREDOR";
  productorId: string | null;
  nombres: string;
  apellidos: string | null;
  descripcion: string;
  fechaVisita: string;
  ubicacionVisita: { type: "Point"; coordinates: [number, number] } | null;
  agronomoUsuarioId: string;
  agronomoNombre: string | null;
};
export type VisitasComercialesFilters = {
  startDate: string;
  endDate: string;
  agronomistUserId: string;
};
export const visitasComercialesService = {
  async list(session: Session, filters: VisitasComercialesFilters, page = 1, limit = 20) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.startDate) params.set("fecha_desde", filters.startDate);
    if (filters.endDate) params.set("fecha_hasta", filters.endDate);
    if (filters.agronomistUserId)
      params.set("agronomo_usuario_id", filters.agronomistUserId);
    const response = await apiRequestEnvelope<VisitaComercial[]>(
      `/visitas-comerciales?${params}`,
      {
        headers: createAuthHeaders(session.accessToken, session.tokenType)
      }
    );
    return {
      items: response.data,
      total: Number(response.meta?.total ?? response.data.length)
    };
  },
  get(session: Session, publicId: string) {
    return apiRequest<VisitaComercial>(`/visitas-comerciales/${publicId}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },
  async listPhotos(session: Session, visitId: string, page: number) {
    const response = await apiRequestEnvelope<Array<{ id: string; publicId: string; createdAt: string }>>(
      `/comercial/visitas/${visitId}/fotos?page=${page}&limit=20`,
      { headers: createAuthHeaders(session.accessToken, session.tokenType) }
    );
    return { items: response.data, total: Number(response.meta?.total ?? response.data.length) };
  },
  async viewPhoto(session: Session, visitId: string, photoId: string) {
    const response = await apiDownload(`/comercial/visitas/${visitId}/fotos/${photoId}/contenido`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
    return URL.createObjectURL(response.blob);
  },
  downloadPdf(session: Session, publicId: string) {
    return apiDownload(`/visitas-comerciales/${publicId}/reporte-pdf`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },
  downloadExcel(
    session: Session,
    filters: VisitasComercialesFilters,
    tipo: TipoVisitaFiltro
  ) {
    const params = new URLSearchParams({
      fecha_desde: filters.startDate,
      fecha_hasta: filters.endDate,
      tipo
    });
    if (filters.agronomistUserId)
      params.set("agronomo_usuario_id", filters.agronomistUserId);
    return apiDownload(`/visitas-comerciales/reporte-excel?${params}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  }
};

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
