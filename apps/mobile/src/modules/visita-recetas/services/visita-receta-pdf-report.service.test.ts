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
      {
        mixtureNumber: 1,
        order: 1,
        item: "Corrector de pH",
        activeIngredient: "-",
        dose: "20 ml",
        doseFrequency: "Cada 7 dias"
      },
      {
        mixtureNumber: 1,
        order: 2,
        item: "Fungi Max",
        activeIngredient: "Azoxistrobina",
        dose: "50 ml/cilindro",
        doseFrequency: "Cada 7 dias"
      },
      {
        mixtureNumber: 1,
        order: 3,
        item: "Urea",
        activeIngredient: "-",
        dose: "2 kg/ha",
        doseFrequency: "Cada 7 dias"
      },
      {
        mixtureNumber: 1,
        order: 4,
        item: "Adherente",
        activeIngredient: "-",
        dose: "100 ml",
        doseFrequency: "Cada 7 dias"
      }
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
      activeIngredient: "-",
      dose: "-",
      doseFrequency: "Cada 7 dias"
    });
    expect(rows.map((row) => row.item)).toEqual([
      "Producto historico",
      "Fungi Max",
      "Urea",
      "Corrector de pH",
      "Adherente"
    ]);
  });

  it("renders dose frequency once in the rightmost grouped column", () => {
    const html = renderProducerMixturePlan(buildRecipe(), [
      { id: "ph", name: "Corrector de pH", description: null },
      { id: "adh", name: "Adherente", description: null }
    ]);

    expect(html).toContain("Mezclas y dosis");
    expect(html).toContain("Productos y coadyuvantes (en orden)");
    expect(html).toContain("Ingrediente activo");
    expect(html).toContain("Frecuencia de dosis");
    expect(html).toContain("Azoxistrobina");
    expect(html).toContain("50 ml/cilindro");
    expect(html).toContain('rowspan="4">1</td>');
    expect(html).toContain('class="mixture-plan-frequency" rowspan="4">Cada 7 dias</td>');
    expect(html.match(/mixture-plan-number/g)).toHaveLength(1);
    expect(html).not.toContain("Cantidad total");
    expect(html).not.toContain("Factor de incidencia");
  });

  it("uses a dash when a product has no active ingredient", () => {
    const receta = buildRecipe();
    receta.mezclas[0].productos[0].ingredienteActivoNombre = null;

    const product = buildProducerMixtureRows(receta, []).find(
      (row) => row.item === "Fungi Max"
    );

    expect(product?.activeIngredient).toBe("-");
  });

  it("escapes the grouped dose frequency", () => {
    const receta = buildRecipe();
    receta.mezclas[0].frecuenciaDosis = "<script>alert('x')</script>";

    const html = renderProducerMixturePlan(receta, []);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;");
  });
});

function buildRecipe() {
  return {
    mezclas: [
      {
        numero: 1,
        frecuenciaDosis: "Cada 7 dias",
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
