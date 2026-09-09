import { describe, expect, it } from "vitest";

import { getVisibleSelectOptions } from "./app-select-field-options";

const options = [
  { label: "Abamectina" },
  { label: "Boro" },
  { label: "Calcio" },
  { label: "Deltametrina" },
  { label: "Extracto vegetal" },
  { label: "Fósforo", helper: "Fertilizante · Sólido" },
  { label: "Giberelina" }
];

describe("opciones visibles de un selector buscable", () => {
  it("muestra solo las primeras cinco opciones antes de escribir", () => {
    const result = getVisibleSelectOptions(options, "", true, 5);

    expect(result.visibleOptions.map((option) => option.label)).toEqual([
      "Abamectina",
      "Boro",
      "Calcio",
      "Deltametrina",
      "Extracto vegetal"
    ]);
    expect(result.matchingOptionCount).toBe(7);
    expect(result.hasSearchText).toBe(false);
  });

  it("busca en todo el catálogo aunque la opción no esté entre las cinco iniciales", () => {
    const result = getVisibleSelectOptions(options, "fosforo", true, 5);

    expect(result.visibleOptions).toEqual([
      { label: "Fósforo", helper: "Fertilizante · Sólido" }
    ]);
    expect(result.matchingOptionCount).toBe(1);
    expect(result.hasSearchText).toBe(true);
  });

  it("limita también una búsqueda amplia a cinco coincidencias", () => {
    const result = getVisibleSelectOptions(
      options.map((option) => ({ ...option, helper: "Producto agrícola" })),
      "producto",
      true,
      5
    );

    expect(result.visibleOptions).toHaveLength(5);
    expect(result.matchingOptionCount).toBe(7);
  });
});
