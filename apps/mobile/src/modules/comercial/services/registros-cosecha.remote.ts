import type { HarvestRecordInput } from "@agrogest/validation";

import { apiRequest, type ApiRequestContext } from "../../../shared/services";

export type RegistroCosechaRemote = HarvestRecordInput & {
  id: string;
  publicId: string;
};

export function createRegistroCosecha(
  body: HarvestRecordInput & { publicId: string },
  context: ApiRequestContext = {}
) {
  return apiRequest<RegistroCosechaRemote>("/comercial/registros-cosecha", {
    method: "POST",
    body,
    ...context
  });
}
