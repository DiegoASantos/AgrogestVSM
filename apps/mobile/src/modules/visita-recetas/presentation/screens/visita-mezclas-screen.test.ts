import { describe, expect, it } from "vitest";
import {
  copyMixtureConfiguration,
  mixtureStatus,
  parseMixtureCount,
  shouldShowMixtureNavigation,
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
    coadyuvantesDosis: { c1: "100 ml/cilindro" },
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
    copied.coadyuvantesDosis.c1 = "200 ml/cilindro";

    expect(source.assignments[0]!.dose).toBe("1");
    expect(source.coadyuvantesIds).toEqual(["c1"]);
    expect(source.coadyuvantesDosis).toEqual({ c1: "100 ml/cilindro" });
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

  it("mantiene incompleta la mezcla mientras un coadyuvante no tenga dosis", () => {
    expect(
      mixtureStatus({ ...mixture(1), coadyuvantesDosis: { c1: "" } }, products)
    ).toBe("En progreso");
  });

  it("permite vaciar temporalmente la cantidad antes de confirmar otro valor", () => {
    expect(parseMixtureCount("")).toBeNull();
    expect(parseMixtureCount("2")).toBe(2);
    expect(parseMixtureCount("25")).toBe(20);
  });

  it("oculta la navegacion cuando solo existe una mezcla", () => {
    expect(shouldShowMixtureNavigation(1)).toBe(false);
    expect(shouldShowMixtureNavigation(2)).toBe(true);
  });
});
