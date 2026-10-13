import { describe, expect, it } from "vitest";

import { prepararNombrePersona, tieneDosApellidos } from "./normalizar-nombre-persona";

describe("nombre de productor persona", () => {
  it("normaliza nombres y apellidos sin importar las mayusculas ingresadas", () => {
    expect(prepararNombrePersona("  mARÍA   jOSÉ  ")).toBe("María José");
    expect(prepararNombrePersona("pÉREZ")).toBe("Pérez");
    expect(prepararNombrePersona("DE LA CRUZ")).toBe("De La Cruz");
  });

  it("formatea apellidos compuestos sin modificar sus separadores", () => {
    expect(prepararNombrePersona("o'NEILL-SALAZAR")).toBe("O'Neill-Salazar");
  });

  it("exige al menos dos partes en el unico campo de apellidos", () => {
    expect(tieneDosApellidos("Pérez")).toBe(false);
    expect(tieneDosApellidos("  PÉREZ   LÓPEZ  ")).toBe(true);
    expect(tieneDosApellidos("  ")).toBe(false);
  });
});
