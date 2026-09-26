import type { HarvestCreditorInput } from "@agrogest/validation";

import { apiRequest, type ApiRequestContext } from "../../../shared/services";

export type AcreedorCosechaRemote = HarvestCreditorInput & {
  id: string;
  publicId: string;
  createdAt: string;
  updatedAt: string;
};

export function createAcreedorCosecha(
  body: HarvestCreditorInput & { publicId: string },
  context: ApiRequestContext = {}
) {
  return apiRequest<AcreedorCosechaRemote>("/comercial/acreedores-cosecha", {
    method: "POST",
    body,
    ...context
  });
}

export function getAcreedoresCosecha(productorId: string, context: ApiRequestContext = {}) {
  return apiRequest<AcreedorCosechaRemote[]>(
    `/comercial/productores/${productorId}/acreedores-cosecha`,
    context
  );
}
