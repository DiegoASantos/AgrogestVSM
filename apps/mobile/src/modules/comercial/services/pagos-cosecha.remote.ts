import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import type { HarvestPaymentInput } from "@agrogest/validation";

type CreatePagoCosechaRequest = HarvestPaymentInput & { publicId: string };

export function createPagoCosecha(
  body: CreatePagoCosechaRequest,
  context: ApiRequestContext = {}
) {
  return apiRequest<{ id: string }>("/comercial/pagos-cosecha", {
    method: "POST",
    body,
    ...context
  });
}
