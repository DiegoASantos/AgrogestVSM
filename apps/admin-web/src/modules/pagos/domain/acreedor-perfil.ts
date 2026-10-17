import type { AcreedorCosecha, AcreedorCosechaPayload } from "../types/pagos.types";

export function creditorSaveAction(form: AcreedorCosechaPayload, chosen: AcreedorCosecha | null) {
  if (!chosen || chosen.productorId !== form.productorId) return "create";
  return Object.entries(form).every(([key, value]) =>
    chosen[key as keyof AcreedorCosecha] === value) ? "select" : "update";
}
