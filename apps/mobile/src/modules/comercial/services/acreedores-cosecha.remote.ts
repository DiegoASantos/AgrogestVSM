import type { HarvestCreditorIdentityInput } from "./acreedores-cosecha.service";

import { apiRequest, type ApiRequestContext } from "../../../shared/services";

export type AcreedorCosechaRemote = HarvestCreditorIdentityInput & {
  id: string;
  publicId: string;
  approvalStatus: "INCOMPLETE" | "PENDING" | "APPROVED" | "OBSERVED";
  source: "PRODUCTOR" | "MOBILE" | "ADMIN_WEB";
  reviewObservation: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createAcreedorCosecha(
  body: HarvestCreditorIdentityInput & { publicId: string },
  context: ApiRequestContext = {}
) {
  const identityOnly = !body.bank && !body.accountNumber;
  return apiRequest<AcreedorCosechaRemote>(identityOnly
    ? "/comercial/acreedores-cosecha/identidad"
    : "/comercial/acreedores-cosecha", {
    method: "POST",
    body: identityOnly ? {
      publicId: body.publicId,
      productorId: body.productorId,
      creditorFirstName: body.creditorFirstName,
      creditorLastName: body.creditorLastName,
      creditorDocumentType: body.creditorDocumentType,
      creditorDocumentNumber: body.creditorDocumentNumber
    } : body,
    ...context
  });
}

export function completeAcreedorCosechaRemote(
  id: string,
  bank: NonNullable<HarvestCreditorIdentityInput["bank"]>,
  accountNumber: string,
  context: ApiRequestContext = {}
) {
  return apiRequest<AcreedorCosechaRemote>(`/comercial/acreedores-cosecha/${id}/completar`, {
    method: "PATCH", body: { bank, accountNumber }, ...context
  });
}

export function issueProducerCreditorAccess(productorId: string) {
  return apiRequest<{ code: string; expiresAt: string }>(
    `/comercial/productores/${productorId}/acceso-acreedores`, {
      method: "POST",
      networkPolicy: "interactive"
    }
  );
}

export function getAcreedoresCosecha(productorId: string, context: ApiRequestContext = {}) {
  return apiRequest<AcreedorCosechaRemote[]>(
    `/comercial/productores/${productorId}/acreedores-cosecha`,
    context
  );
}
