import { describe, expect, it } from "vitest";

import type { RecetaFitosanidad, RecetaFertilizacion } from "../../types";
import {
  buildFertilizacionesForSave,
  buildFitosanidadForSave,
  collectNomenclaturaMezcla,
  createEmptyFertilizacion,
  getUnidadDosis,
  restoreFertilizaciones,
  restoreFitosanidadApps
} from "./visita-receta-multiple-products";

const baseFitosanidad: RecetaFitosanidad = {
  id: "fito-1",
  serverId: null,
  recetaLocalId: "receta-1",
  numero: 1,
  objetivo: "plaga",
  objetivoNombre: "Mosca de la fruta",
  tipoControlId: "control-1",
  tipoProductoId: "tipo-1",
  disolvente: "Agua",
  modoAccionId: "modo-1",
  ingredienteActivoNombre: "Spinetoram",
  dosisIa: 2,
  volumenAplicacion: 3,
  cantidadTotalIa: 12,
  marcaProductoNombre: "Producto A",
  concentracionProducto: 4,
  cantidadTotalProducto: 3,
  coadyuvantesIds: '["coad-1"]',
  ordenMezcla: '["Agua","Aceite penetrante"]',
  syncStatus: "pending",
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z"
};

describe("receta con multiples productos", () => {
  it("agrupa filas del mismo objetivo y conserva ingredientes independientes", () => {
    const apps = restoreFitosanidadApps(
      [
        baseFitosanidad,
        {
          ...baseFitosanidad,
          id: "fito-2",
          ingredienteActivoNombre: "Imidacloprid",
          marcaProductoNombre: "Producto B"
        }
      ],
      [
        { id: "ia-1", publicId: "ia-1", name: "Spinetoram", description: null },
        { id: "ia-2", publicId: "ia-2", name: "Imidacloprid", description: null }
      ],
      [
        {
          id: "marca-1",
          publicId: "marca-1",
          name: "Producto A",
          tipoProductoId: "tipo-1",
          ingredienteActivoId: "ia-1",
          ingredienteActivoNombre: "Spinetoram",
          concentracion: 4,
          concentracionTexto: "4",
          unidadMedida: "%"
        },
        {
          id: "marca-2",
          publicId: "marca-2",
          name: "Producto B",
          tipoProductoId: "tipo-1",
          ingredienteActivoId: "ia-2",
          ingredienteActivoNombre: "Imidacloprid",
          concentracion: 5,
          concentracionTexto: "5",
          unidadMedida: "%"
        }
      ]
    );

    expect(apps).toHaveLength(1);
    expect(apps[0]?.ingredientes.map((item) => item.ingredienteActivoNombre)).toEqual([
      "Spinetoram",
      "Imidacloprid"
    ]);
  });

  it("aplana cada ingrediente como una fila con cabecera compartida", () => {
    const [application] = restoreFitosanidadApps(
      [baseFitosanidad, { ...baseFitosanidad, id: "fito-2" }],
      [],
      []
    );
    const rows = buildFitosanidadForSave([application!], 2);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      objetivoNombre: "Mosca de la fruta",
      volumenAplicacion: 3,
      cantidadTotalIa: 12
    });
    expect(rows[1]).toMatchObject({
      objetivoNombre: "Mosca de la fruta",
      coadyuvantesIds: '["coad-1"]'
    });

    const reopened = restoreFitosanidadApps(
      rows.map(
        (row, index) =>
          ({
            ...baseFitosanidad,
            ...row,
            id: `round-trip-${index}`
          }) satisfies RecetaFitosanidad
      ),
      [],
      []
    );

    expect(reopened).toHaveLength(1);
    expect(reopened[0]?.ingredientes).toHaveLength(2);
  });

  it("restaura y guarda todos los fertilizantes", () => {
    const rows: RecetaFertilizacion[] = [
      makeFertilizacion("fert-1", "Urea Agricola"),
      makeFertilizacion("fert-2", "Sulfato de Potasio")
    ];
    const restored = restoreFertilizaciones(rows, []);

    expect(restored).toHaveLength(2);
    expect(restored[0]?.unidadDosis).toBe("Kg/cilindro");
    expect(
      buildFertilizacionesForSave(restored).map((item) => item.fertilizanteNombre)
    ).toEqual(["Urea Agricola", "Sulfato de Potasio"]);
    expect(buildFertilizacionesForSave(restored)[0]?.unidadDosis).toBe("Kg/cilindro");
  });

  it.each([
    ["edafica", "solido", "Kg/planta"],
    ["edafica", "liquido", "L/planta"],
    ["foliar", "solido", "Kg/cilindro"],
    ["foliar", "liquido", "L/cilindro"]
  ] as const)("calcula la unidad para via %s y producto %s", (via, tipo, expected) => {
    const fertilizacion = {
      ...createEmptyFertilizacion(),
      viaAplicacion: via,
      tipoProducto: tipo
    };

    expect(getUnidadDosis(fertilizacion)).toBe(expected);
  });

  it("reune ingredientes, marcas, coadyuvantes y fertilizantes sin duplicados", () => {
    const [application] = restoreFitosanidadApps([baseFitosanidad], [], []);
    const fertilizaciones = restoreFertilizaciones(
      [makeFertilizacion("fert-1", "Urea Agricola")],
      []
    );

    expect(
      collectNomenclaturaMezcla([application!], fertilizaciones, [
        { id: "coad-1", name: "Aceite penetrante", description: null }
      ])
    ).toEqual(["Spinetoram", "Producto A", "Aceite penetrante", "Urea Agricola"]);
  });
});

function makeFertilizacion(id: string, name: string): RecetaFertilizacion {
  return {
    id,
    serverId: null,
    recetaLocalId: "receta-1",
    viaAplicacion: "foliar",
    fertilizanteNombre: name,
    tipoProducto: "solido",
    dosis: 1,
    unidadDosis: "Kg/cilindro",
    cantidadTotalPlantas: null,
    volumenAplicacion: 2,
    cantidadTotalFertilizante: 2,
    syncStatus: "pending",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z"
  };
}
