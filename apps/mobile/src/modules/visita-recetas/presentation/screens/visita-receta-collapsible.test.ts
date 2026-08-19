import { describe, expect, it } from "vitest";

import {
  buildConsolidacionSummary,
  buildLaboresSummary,
  buildOptionalRecipeSectionStatus,
  buildRiegoSummary
} from "./visita-receta-collapsible";

describe("resumenes de secciones colapsables de receta", () => {
  it("resume hallazgos por tipo y etapa fenologica", () => {
    expect(
      buildConsolidacionSummary({
        etapaFenologica: "Floracion",
        plagas: [{ nombre: "Trips" }] as never[],
        enfermedades: [],
        nutricion: [{ elemento: "Boro" }] as never[],
        riego: { humedadSuelo: null, estresHidrico: null },
        labores: [{ nombre: "Poda" }, { nombre: "Limpieza" }] as never[]
      })
    ).toBe("Floracion · 1 plaga · 1 deficiencia · 2 labores");
  });

  it("distingue secciones opcionales registradas y vacias", () => {
    expect(buildOptionalRecipeSectionStatus(false)).toEqual({
      label: "Sin registros",
      tone: "warning"
    });
    expect(buildOptionalRecipeSectionStatus(true)).toEqual({
      label: "Registrado",
      tone: "success"
    });
  });

  it("resume riego y labores sin presentar lo opcional como pendiente", () => {
    expect(buildRiegoSummary(null)).toBe("Sin recomendacion seleccionada · Opcional");
    expect(buildRiegoSummary("Riego ligero")).toBe("Seleccionado: Riego ligero");
    expect(buildLaboresSummary(0)).toBe("Sin recomendaciones seleccionadas · Opcional");
    expect(buildLaboresSummary(2)).toBe("2 recomendaciones seleccionadas");
  });
});
