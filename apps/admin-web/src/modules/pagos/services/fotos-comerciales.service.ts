import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiDownload,
  apiRequestEnvelope,
  createAuthHeaders
} from "../../../shared/services/api/client";

type Auth = Pick<AuthSession, "accessToken" | "tokenType">;
const headers = (session: Auth) => createAuthHeaders(session.accessToken, session.tokenType);

export type ProductorConFotos = {
  productorId: string;
  productorNombre: string;
  cantidadFotos: number;
  ultimaFotoAt: string;
};

export type FotoComercial = {
  id: string;
  publicId: string;
  createdAt: string;
};

export const fotosComercialesService = {
  async listProducers(session: Auth, page: number, search: string) {
    const response = await apiRequestEnvelope<ProductorConFotos[]>(
      `/comercial/mantenimiento/productores-con-fotos?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
      { headers: headers(session) }
    );
    return {
      items: response.data,
      total: Number(response.meta?.total ?? response.data.length)
    };
  },
  async listPhotos(session: Auth, producerId: string, page: number) {
    const response = await apiRequestEnvelope<FotoComercial[]>(
      `/comercial/mantenimiento/productores/${producerId}/fotos?page=${page}&limit=20`,
      { headers: headers(session) }
    );
    return { items: response.data, total: Number(response.meta?.total ?? response.data.length) };
  },
  async viewPhoto(session: Auth, photoId: string) {
    const response = await apiDownload(
      `/comercial/mantenimiento/fotos/${photoId}/contenido`,
      { headers: headers(session) }
    );
    return URL.createObjectURL(response.blob);
  },
  async listCreditorPhotos(session: Auth, creditorId: string, page: number) {
    const response = await apiRequestEnvelope<FotoComercial[]>(
      `/comercial/acreedores/${creditorId}/fotos?page=${page}&limit=20`,
      { headers: headers(session) }
    );
    return { items: response.data, total: Number(response.meta?.total ?? response.data.length) };
  },
  async viewCreditorPhoto(session: Auth, creditorId: string, photoId: string) {
    const response = await apiDownload(
      `/comercial/acreedores/${creditorId}/fotos/${photoId}/contenido`,
      { headers: headers(session) }
    );
    return URL.createObjectURL(response.blob);
  }
};
