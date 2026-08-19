import { describe, expect, it } from "vitest";

import type { VisitaRecetaCompleta } from "../types";
import {
  buildProducerMixtureRows,
  renderProducerMixturePlan
} from "./producer-recipe-mixture-plan";

describe("producer recipe mixture plan", () => {
  it("orders products, fertilizers and coadjuvants with their doses", () => {
    const rows = buildProducerMixtureRows(buildRecipe(), [
      { id: "ph", name: "Corrector de pH", description: null },
      { id: "adh", name: "Adherente", description: null }
    ]);

    expect(rows).toEqual([
      { mixtureNumber: 1, order: 1, item: "Corrector de pH", dose: "20 ml" },
      { mixtureNumber: 1, order: 2, item: "Fungi Max", dose: "50 ml/cilindro" },
      { mixtureNumber: 1, order: 3, item: "Urea", dose: "2 kg/ha" },
      { mixtureNumber: 1, order: 4, item: "Adherente", dose: "100 ml" }
    ]);
  });

  it("keeps historical order entries and appends current omitted products", () => {
    const receta = buildRecipe();
    receta.mezclas[0].ordenMezcla = JSON.stringify(["Agua", "Producto historico"]);

    const rows = buildProducerMixtureRows(receta, [
      { id: "ph", name: "Corrector de pH", description: null },
      { id: "adh", name: "Adherente", description: null }
    ]);

    expect(rows[0]).toEqual({
      mixtureNumber: 1,
      order: 1,
      item: "Producto historico",
      dose: "-"
    });
    expect(rows.map((row) => row.item)).toEqual([
      "Producto historico",
      "Fungi Max",
      "Urea",
      "Corrector de pH",
      "Adherente"
    ]);
  });

  it("renders only the three requested mixture columns", () => {
    const html = renderProducerMixturePlan(buildRecipe(), [
      { id: "ph", name: "Corrector de pH", description: null },
      { id: "adh", name: "Adherente", description: null }
    ]);

    expect(html).toContain("Mezclas y dosis");
    expect(html).toContain("Productos y coadyuvantes (en orden)");
    expect(html).toContain("50 ml/cilindro");
    expect(html).not.toContain("Cantidad total");
    expect(html).not.toContain("Factor de incidencia");
  });
});

function buildRecipe() {
  return {
    mezclas: [
      {
        numero: 1,
        coadyuvantesIds: JSON.stringify(["ph", "adh"]),
        coadyuvantesDosis: JSON.stringify({ ph: "20 ml", adh: "100 ml" }),
        ordenMezcla: JSON.stringify([
          "Agua",
          "Corrector de pH",
          "Fungi Max",
          "Urea",
          "Adherente"
        ]),
        productos: [
          {
            marcaProductoNombre: "Fungi Max",
            ingredienteActivoNombre: "Azoxistrobina",
            dosisProducto: 50,
            unidadDosis: "ml/cilindro"
          }
        ]
      }
    ],
    fertilizacion: [
      {
        mezclaNumero: 1,
        fertilizanteNombre: "Urea",
        dosis: 2,
        unidadDosis: "kg/ha"
      }
    ]
  } as unknown as VisitaRecetaCompleta;
}
