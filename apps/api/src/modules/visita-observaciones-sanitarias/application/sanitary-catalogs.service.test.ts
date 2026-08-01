import { describe, expect, it } from "vitest";

import { resolveStageLevelDescription } from "./sanitary-catalogs.service";

describe("descripción de incidencia de enfermedades", () => {
  it.each([
    [0, "0% de árboles enfermos."],
    [1, "Más de 0% y hasta 5% de árboles enfermos."],
    [2, "Más de 5% y hasta 20% de árboles enfermos."],
    [3, "Más de 20% y hasta 100% de árboles enfermos."]
  ])("expone la descripción canónica del grado %i", (grade, description) => {
    expect(
      resolveStageLevelDescription({
        description: "Descripción antigua",
        plagaEnfermedad: { type: "enfermedad" },
        nivelIncidenciaSeveridad: { type: "incidencia", grade }
      } as never)
    ).toBe(description);
  });

  it("preserva la descripción configurada para severidad", () => {
    expect(
      resolveStageLevelDescription({
        description: "Daño visible en hojas y frutos.",
        plagaEnfermedad: { type: "enfermedad" },
        nivelIncidenciaSeveridad: { type: "severidad", grade: 2 }
      } as never)
    ).toBe("Daño visible en hojas y frutos.");
  });
});
