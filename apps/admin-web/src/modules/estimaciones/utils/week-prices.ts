import type { EstimationWeekPrices } from "../types/estimaciones.types";

export type PriceDrafts = { minimum: string; maximum: string };

export function createPriceDrafts(data: EstimationWeekPrices): PriceDrafts {
  return {
    minimum: data.priceRange ? String(data.priceRange.precioMinimo) : "",
    maximum: data.priceRange ? String(data.priceRange.precioMaximo) : ""
  };
}

export function validatePriceDrafts(drafts: PriceDrafts): string | null {
  const values = [drafts.minimum.trim(), drafts.maximum.trim()];
  if (values.every((value) => value === "")) return null;
  if (values.some((value) => !/^\d+(?:[.,]\d{1,2})?$/.test(value) || Number(value.replace(",", ".")) > 9999999999.99)) {
    return "Ingresa ambos precios no negativos, con hasta dos decimales (máximo S/ 9 999 999 999.99).";
  }
  if (parsePrice(values[0])! > parsePrice(values[1])!) {
    return "El precio mínimo no puede ser mayor que el máximo.";
  }
  return null;
}

export function priceDraftPayload(drafts: PriceDrafts) {
  return { precioMinimo: parsePrice(drafts.minimum), precioMaximo: parsePrice(drafts.maximum) };
}

export function hasPriceChanges(data: EstimationWeekPrices | null, drafts: PriceDrafts) {
  if (!data) return false;
  const saved = createPriceDrafts(data);
  return saved.minimum !== drafts.minimum || saved.maximum !== drafts.maximum;
}

function parsePrice(value: string) {
  return value.trim() === "" ? null : Number(value.trim().replace(",", "."));
}
