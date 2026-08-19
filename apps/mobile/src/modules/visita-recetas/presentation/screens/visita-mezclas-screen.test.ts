import { describe, expect, it } from "vitest";
import {
  copyMixtureConfiguration,
  mixtureStatus,
  validateMixtures,
  type EditableMixture,
  type ProductOption
} from "./visita-mezclas-form";

const products: ProductOption[] = [
  {
    ref: "fito-1",
    kind: "fitosanitario",
    label: "Producto A",
    subtitle: "Trips",
    dose: "1",
    unit: "ml/cilindro",
    plants: "",
    viaAplicacion: "foliar"
  },
  {
    ref: "fert-1",
    kind: "fertilizante",
    label: "Fertilizante B",
    subtitle: "Edafico",
    dose: "2",
    unit: "g/planta",
    plants: "100",
    viaAplicacion: "edafica"
  }
];

function mixture(numero: number): EditableMixture {
  return {
    localId: `m-${numero}`,
    numero,
    volumenAplicacion: "2",
    coadyuvantesIds: ["c1"],
    ordenMezcla: ["Agua", "Producto A"],
    factor: "1",
    factorEditable: false,
    cantidadTotalProducto: "",
    assignments: [
      {
        productRef: "fito-1",
        kind: "fitosanitario",
        dose: "1",
        unit: "ml/cilindro",
        plants: ""
      },
      {
        productRef: "fert-1",
        kind: "fertilizante",
        dose: "2",
        unit: "g/planta",
        plants: "100"
      }
    ]
  };
}

describe("formulario guiado de mezclas", () => {
  it("considera lista una mezcla con volumen, dosis y plantas requeridas", () => {
    expect(mixtureStatus(mixture(1), products)).toBe("Lista");
    expect(
      validateMixtures([mixture(1)], products, new Set(["fito-1", "fert-1"]))
    ).toBeNull();
  });

  it("permite reutilizar los mismos productos en otra mezcla", () => {
    const result = validateMixtures(
      [mixture(1), mixture(2)],
      products,
      new Set(["fito-1", "fert-1"])
    );
    expect(result).toBeNull();
  });

  it("copia profundamente y conserva independiente el destino", () => {
    const source = mixture(1);
    const copied = copyMixtureConfiguration(source);
    copied.assignments[0]!.dose = "5";
    copied.coadyuvantesIds.push("c2");

    expect(source.assignments[0]!.dose).toBe("1");
    expect(source.coadyuvantesIds).toEqual(["c1"]);
  });

  it("rechaza productos sin asignar y mezclas vacias", () => {
    expect(validateMixtures([mixture(1)], products, new Set(["fito-1"]))).toContain(
      "Fertilizante B"
    );
    expect(
      validateMixtures(
        [{ ...mixture(1), assignments: [] }],
        products,
        new Set(["fito-1", "fert-1"])
      )
    ).toContain("no puede quedar vacia");
  });
});
