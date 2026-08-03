import { describe, expect, it } from "vitest";

import {
  construirMensajeAdvertencia,
  REGLAS_INCOMPATIBILIDAD,
  validarMezcla
} from "./validacion-mezclas";

describe("validacion de mezclas", () => {
  it("mantiene las doce reglas con niveles equilibrados", () => {
    expect(REGLAS_INCOMPATIBILIDAD).toHaveLength(12);
    expect(
      REGLAS_INCOMPATIBILIDAD.filter((regla) => regla.nivel === "evitar")
    ).toHaveLength(6);
    expect(
      REGLAS_INCOMPATIBILIDAD.filter((regla) => regla.nivel === "precaucion")
    ).toHaveLength(6);
  });

  it("no advierte para una mezcla vacia", () => {
    expect(validarMezcla([])).toEqual([]);
    expect(construirMensajeAdvertencia([])).toBe("");
  });

  it("detecta una incompatibilidad de nivel evitar sin depender de tildes o mayusculas", () => {
    expect(
      validarMezcla([" oxicloruro de cobre ", "Ácido orgánico + indicador"])
    ).toEqual([expect.objectContaining({ id: "cobre-acido", nivel: "evitar" })]);
  });

  it("detecta el alias real del catalogo Sulfato Magnesio", () => {
    expect(validarMezcla(["Nitrato de Calcio", "Sulfato Magnesio"])).toEqual([
      expect.objectContaining({ id: "calcio-sulfatos" })
    ]);
  });

  it("advierte por Abamectina sin secuestrante y deja de advertir al agregarlo", () => {
    expect(validarMezcla(["Abamectina"])).toEqual([
      expect.objectContaining({ id: "abamectina-sin-secuestrante", nivel: "precaucion" })
    ]);
    expect(validarMezcla(["Abamectina", "Secuestrante de sales"])).toEqual([]);
  });

  it.each(["Corrector de pH", "Ácido orgánico + indicador", "Buffer P.H."])(
    "acepta %s como corrector de pH para las reglas de alcalinidad",
    (corrector) => {
      expect(validarMezcla(["Imidacloprid", corrector])).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "imidacloprid-sin-corrector" })
        ])
      );
      expect(validarMezcla(["Fluopyram", corrector])).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "fluopyram-sin-corrector" })
        ])
      );
    }
  );

  it("describe una ausencia como condicion y no como producto agregado", () => {
    const mensaje = construirMensajeAdvertencia(validarMezcla(["Abamectina"]));

    expect(mensaje).toContain("Productos: Abamectina");
    expect(mensaje).toContain("Condición: Sin Secuestrante de sales");
    expect(mensaje).not.toContain("Productos: Abamectina + Sin");
  });

  it.each([
    [["Oxicloruro de Cobre", "Ácido orgánico + indicador"], "cobre-acido"],
    [["Oxicloruro de Cobre", "Basfoliar Zinc"], "cobre-zinc"],
    [["Glifosato", "Sulfato Magnesio"], "glifosato-cationes"],
    [["Yaraliva Calcinit", "Sulfato de Potasio"], "calcio-sulfatos"],
    [["Yaraliva Calcinit", "DAP"], "calcio-fosfatos"],
    [["Kelatox Zinc", "DAP"], "zinc-fosfatos"],
    [["Abamectina"], "abamectina-sin-secuestrante"],
    [["Imidacloprid"], "imidacloprid-sin-corrector"],
    [["Spinetoram", "Aceite penetrante"], "spinetoram-aceite"],
    [["Oxicloruro de Cobre", "Thiabendazole"], "cobre-thiabendazole"],
    [["Paclobutrazol", "Urea Agrícola"], "paclobutrazol-nitrogeno"],
    [["Fluopyram"], "fluopyram-sin-corrector"]
  ])("reconoce la nomenclatura real del catalogo: %s", (nombres, expectedId) => {
    expect(validarMezcla(nombres)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: expectedId })])
    );
  });

  it("construye un mensaje completo con nivel, detalle y disclaimer", () => {
    const advertencias = validarMezcla([
      "Oxicloruro de Cobre",
      "Acido organico + indicador",
      "Thiabendazole"
    ]);
    const mensaje = construirMensajeAdvertencia(advertencias);

    expect(mensaje).toContain("🔴 EVITAR");
    expect(mensaje).toContain("\u{1F7E1} PRECAUCIÓN");
    expect(mensaje).toContain("Motivo:");
    expect(mensaje).toContain("Efecto posible:");
    expect(mensaje).toContain("Recomendación:");
    expect(mensaje).toContain("mezclas separadas");
    expect(mensaje).toContain("La decisión final es del profesional responsable.");
  });
});
