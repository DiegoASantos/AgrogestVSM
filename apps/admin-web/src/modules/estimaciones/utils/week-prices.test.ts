import { describe, expect, it } from "vitest";
import { createPriceDrafts, hasPriceChanges, priceDraftPayload, validatePriceDrafts } from "./week-prices";

describe("Borradores de precios", () => {
  it("distingue sin estimación de un rango cero", () => {
    const empty = { startDate: "2026-10-19", endDate: "2026-10-25", priceRange: null };
    expect(createPriceDrafts(empty)).toEqual({ minimum: "", maximum: "" });
    expect(hasPriceChanges(empty, { minimum: "0", maximum: "0" })).toBe(true);
    expect(priceDraftPayload({ minimum: "", maximum: "" })).toEqual({ precioMinimo: null, precioMaximo: null });
  });
  it("admite centavos y coma decimal", () => {
    const drafts = { minimum: "20,50", maximum: "30.75" };
    expect(validatePriceDrafts(drafts)).toBeNull();
    expect(priceDraftPayload(drafts)).toEqual({ precioMinimo: 20.5, precioMaximo: 30.75 });
  });
  it.each([["1", ""], ["", "2"], ["-1", "2"], ["3", "2"], ["1.001", "2"], ["1e2", "200"], ["NaN", "2"], ["1", "10000000000"]])("rechaza %s–%s", (minimum, maximum) => {
    expect(validatePriceDrafts({ minimum, maximum })).not.toBeNull();
  });
});
