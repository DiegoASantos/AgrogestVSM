import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  apiRequestEnvelope,
  createAuthHeaders
} from "../../../shared/services/api/client";
import type {
  AcreedorCosecha,
  AcreedorCosechaPayload,
  AcreedorPago,
  AcreedorPagoPayload,
  DetallePagoProductor,
  DetallePagoProductorPayload,
  PagoCatalogs,
  PagoProductor,
  PagoProductorPayload,
  PagoProductorStatus
} from "../types/pagos.types";

type Auth = Pick<AuthSession, "accessToken" | "tokenType">;
const headers = (session: Auth) =>
  createAuthHeaders(session.accessToken, session.tokenType);

export const pagosService = {
  async catalogs(session: Auth) {
    return apiRequest<PagoCatalogs>("/pagos/catalogos", { headers: headers(session) });
  },
  async list(session: Auth, page = 1, limit = 50) {
    const response = await apiRequestEnvelope<PagoProductor[]>(
      `/pagos/productores?page=${page}&limit=${limit}`,
      { headers: headers(session) }
    );
    return {
      items: response.data,
      total: Number(response.meta?.total ?? response.data.length)
    };
  },
  get(session: Auth, id: string) {
    return apiRequest<PagoProductor>(`/pagos/productores/${id}`, {
      headers: headers(session)
    });
  },
  create(session: Auth, payload: PagoProductorPayload) {
    return apiRequest<PagoProductor>("/pagos/productores", {
      method: "POST",
      body: payload,
      headers: headers(session)
    });
  },
  update(
    session: Auth,
    id: string,
    payload: Partial<PagoProductorPayload> & { estado?: PagoProductorStatus }
  ) {
    return apiRequest<PagoProductor>(`/pagos/productores/${id}`, {
      method: "PATCH",
      body: payload,
      headers: headers(session)
    });
  },
  remove(session: Auth, id: string) {
    return apiRequest<{ id: string; eliminado: boolean }>(`/pagos/productores/${id}`, {
      method: "DELETE",
      headers: headers(session)
    });
  },
  async approvedCreditors(session: Auth, paymentId: string) {
    return apiRequest<AcreedorPago[]>(
      `/pagos/productores/${paymentId}/acreedores-aprobados`,
      { headers: headers(session) }
    );
  },
  approvedCreditorsByProducer(session: Auth, producerId: string) {
    return apiRequest<AcreedorPago[]>(
      `/pagos/acreedores-aprobados?productorId=${encodeURIComponent(producerId)}`,
      { headers: headers(session) }
    );
  },
  createComplete(
    session: Auth,
    payload: { cabecera: PagoProductorPayload; detalles: DetallePagoProductorPayload[] }
  ) {
    return apiRequest<PagoProductor>("/pagos/productores/completo", {
      method: "POST",
      body: payload,
      headers: headers(session)
    });
  },
  updateComplete(
    session: Auth,
    id: string,
    payload: {
      cabecera: Partial<PagoProductorPayload> & { estado?: PagoProductorStatus };
      detalles: Array<
        DetallePagoProductorPayload & { id?: string; estado?: PagoProductorStatus }
      >;
      anularIds: string[];
    }
  ) {
    return apiRequest<PagoProductor>(`/pagos/productores/${id}/completo`, {
      method: "PATCH",
      body: payload,
      headers: headers(session)
    });
  },
  createApprovedCreditor(session: Auth, paymentId: string, payload: AcreedorPagoPayload) {
    return apiRequest<AcreedorPago>(
      `/pagos/productores/${paymentId}/acreedores-aprobados`,
      {
        method: "POST",
        body: payload,
        headers: headers(session)
      }
    );
  },
  saveDetailsBatch(
    session: Auth,
    paymentId: string,
    payload: {
      crear: DetallePagoProductorPayload[];
      actualizar: Array<
        DetallePagoProductorPayload & { id: string; estado?: PagoProductorStatus }
      >;
      anularIds: string[];
    }
  ) {
    return apiRequest<DetallePagoProductor[]>(
      `/pagos/productores/${paymentId}/detalles/lote`,
      {
        method: "POST",
        body: payload,
        headers: headers(session)
      }
    );
  },
  listDetails(session: Auth, paymentId: string) {
    return apiRequest<DetallePagoProductor[]>(
      `/pagos/productores/${paymentId}/detalles`,
      { headers: headers(session) }
    );
  },
  createDetail(session: Auth, paymentId: string, payload: DetallePagoProductorPayload) {
    return apiRequest<DetallePagoProductor>(`/pagos/productores/${paymentId}/detalles`, {
      method: "POST",
      body: payload,
      headers: headers(session)
    });
  },
  updateDetail(
    session: Auth,
    paymentId: string,
    id: string,
    payload: DetallePagoProductorPayload & { estado?: PagoProductorStatus }
  ) {
    return apiRequest<DetallePagoProductor>(
      `/pagos/productores/${paymentId}/detalles/${id}`,
      { method: "PATCH", body: payload, headers: headers(session) }
    );
  },
  removeDetail(session: Auth, paymentId: string, id: string) {
    return apiRequest<DetallePagoProductor>(
      `/pagos/productores/${paymentId}/detalles/${id}`,
      { method: "DELETE", headers: headers(session) }
    );
  },
  async listCreditors(session: Auth, page = 1, limit = 50, search = "") {
    const response = await apiRequestEnvelope<AcreedorCosecha[]>(
      `/comercial/mantenimiento/acreedores-cosecha?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
      { headers: headers(session) }
    );
    return {
      items: response.data,
      total: Number(response.meta?.total ?? response.data.length)
    };
  },
  getCreditor(session: Auth, id: string) {
    return apiRequest<AcreedorCosecha>(
      `/comercial/mantenimiento/acreedores-cosecha/${id}`,
      { headers: headers(session) }
    );
  },
  createCreditor(session: Auth, payload: AcreedorCosechaPayload) {
    return apiRequest<AcreedorCosecha>("/comercial/mantenimiento/acreedores-cosecha", {
      method: "POST",
      body: payload,
      headers: headers(session)
    });
  },
  updateCreditor(session: Auth, id: string, payload: Partial<AcreedorCosechaPayload>) {
    return apiRequest<AcreedorCosecha>(
      `/comercial/mantenimiento/acreedores-cosecha/${id}`,
      { method: "PATCH", body: payload, headers: headers(session) }
    );
  },
  removeCreditor(session: Auth, id: string) {
    return apiRequest<{ id: string; eliminado: boolean }>(
      `/comercial/mantenimiento/acreedores-cosecha/${id}`,
      { method: "DELETE", headers: headers(session) }
    );
  }
};
