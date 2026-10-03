import type { HarvestCreditorInput } from "@agrogest/validation";
import type { AuthSession } from "../../auth/types/auth.types";
import {
  apiRequest,
  createAuthHeaders,
  type ApiSuccessResponse
} from "../../../shared/services/api/client";
import { getApiBaseUrl } from "../../../shared/services/api/config";

export type Creditor = HarvestCreditorInput & {
  id: string;
  publicId: string;
  approvalStatus: "PENDING" | "APPROVED" | "OBSERVED";
  source: "PRODUCTOR" | "MOBILE";
  reviewObservation: string | null;
  reviewedAt: string | null;
  createdAt: string;
  producerName?: string;
  capturedBy?: string;
};
export type ProducerCreditorFields = Omit<HarvestCreditorInput, "productorId">;
export type PublicCreditor = Omit<Creditor, "productorId" | "reviewedAt">;
export type CreditorReviewPage = {
  items: Creditor[];
  total: number;
  page: number;
  pageSize: number;
};

export function listCreditorReviews(session: AuthSession, status: string, page: number) {
  return apiRequest<CreditorReviewPage>(
    `/comercial/revision-acreedores?status=${encodeURIComponent(status)}&page=${page}`,
    { headers: createAuthHeaders(session.accessToken, session.tokenType) }
  );
}

export function reviewCreditor(
  session: AuthSession,
  id: string,
  decision: "APPROVED" | "OBSERVED",
  observation?: string
) {
  return apiRequest<Creditor>(`/comercial/revision-acreedores/${id}`, {
    method: "POST",
    headers: createAuthHeaders(session.accessToken, session.tokenType),
    body: { decision, observation }
  });
}

export function creditorHistory(session: AuthSession, id: string) {
  return apiRequest<
    Array<{
      id: string;
      decision: string;
      observation: string | null;
      reviewerUserId: string;
      createdAt: string;
    }>
  >(`/comercial/revision-acreedores/${id}/historial`, {
    headers: createAuthHeaders(session.accessToken, session.tokenType)
  });
}

async function producerRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
  token?: string
) {
  const response = await fetch(`${getApiBaseUrl()}/comercial/productor${path}`, {
    method,
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "El código o la sesión venció. Ingresa de nuevo el código."
        : response.status === 409
          ? "Este perfil ya existe o cambió. Revisa los datos y vuelve a intentar."
          : "No se pudo completar la operación. Inténtalo nuevamente."
    );
  }
  const payload = (await response.json()) as ApiSuccessResponse<T>;
  if (!payload.success) throw new Error("No se pudo completar la operación.");
  return payload.data;
}

export function exchangeProducerCode(code: string) {
  return producerRequest<{
    session: string;
    expiresInSeconds: number;
    producerName: string;
  }>("/sesion", "POST", { code });
}
export function listProducerCreditors(token: string) {
  return producerRequest<PublicCreditor[]>("/acreedores", "GET", undefined, token);
}
export function producerCreditorHistory(token: string, id: string) {
  return producerRequest<
    Array<{
      decision: "APPROVED" | "OBSERVED";
      observation: string | null;
      createdAt: string;
    }>
  >(`/acreedores/${id}/historial`, "GET", undefined, token);
}
export function saveProducerCreditor(
  token: string,
  fields: ProducerCreditorFields,
  id?: string
) {
  return producerRequest<PublicCreditor>(
    id ? `/acreedores/${id}` : "/acreedores",
    id ? "PATCH" : "POST",
    fields,
    token
  );
}
