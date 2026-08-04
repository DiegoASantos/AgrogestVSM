import { describe, expect, it } from "vitest";

import {
  calculateTotal,
  diseaseFactorFromPercentage,
  factorFromGrade,
  nutritionFactorFromPercentage,
  collectNomenclaturaPorMezcla,
  deriveMezclaFactors
} from "./visita-receta-multiple-products";
import type { AppFitosanidad, AppMezcla } from "./visita-receta-multiple-products";

describe("Spec 029 - factor de incidencia", () => {
  describe("factorFromGrade", () => {
    it.each([
      [0, 1],
      [1, 1],
      [2, 1.2],
      [3, 1.5],
      [4, 1.5]
    ] as const)("grado %i produce factor %f", (grade, expected) => {
      expect(factorFromGrade(grade)).toBe(expected);
    });
  });

  describe("diseaseFactorFromPercentage", () => {
    it.each([
      [0, 1],
      [3, 1],
      [5, 1],
      [6, 1.2],
      [15, 1.2],
      [20, 1.2],
      [21, 1.5],
      [50, 1.5],
      [100, 1.5]
    ] as const)("porcentaje %i produce factor %f", (percentage, expected) => {
      expect(diseaseFactorFromPercentage(percentage)).toBe(expected);
    });
  });

  describe("nutritionFactorFromPercentage", () => {
    it.each([
      [0, 1],
      [5, 1],
      [15, 1.2],
      [40, 1.5]
    ] as const)("porcentaje %i produce factor %f", (percentage, expected) => {
      expect(nutritionFactorFromPercentage(percentage)).toBe(expected);
    });
  });

  describe("calculateTotal", () => {
    it("dosis 250 * volumen 2 * factor 1.2 = 600", () => {
      expect(calculateTotal(250, 2, 1.2)).toBe(600);
    });

    it("devuelve 0 cuando la dosis es 0", () => {
      expect(calculateTotal(0, 2, 1.5)).toBe(0);
    });

    it("devuelve 0 cuando el volumen es 0", () => {
      expect(calculateTotal(250, 0, 1.5)).toBe(0);
    });

    it("devuelve 0 cuando la dosis es null", () => {
      expect(calculateTotal(null, 2, 1.5)).toBe(0);
    });

    it("devuelve 0 cuando el volumen es undefined", () => {
      expect(calculateTotal(250, undefined, 1.5)).toBe(0);
    });

    it("factor nulo se trata como 1", () => {
      expect(calculateTotal(250, 2, null)).toBe(500);
    });

    it("acepta strings numericos con coma", () => {
      expect(calculateTotal("250,5", "2", "1.2")).toBeCloseTo(601.2, 0);
    });

    it("acepta strings vacios como 0", () => {
      expect(calculateTotal("", "2", "1.2")).toBe(0);
    });

    it("con factor 1 el total es dosis * volumen", () => {
      expect(calculateTotal(100, 3, 1)).toBe(300);
    });
  });

  describe("deriveMezclaFactors", () => {
    it("factor 1 para mezcla sin productos asignados", () => {
      const app: AppFitosanidad = {
        localId: "a1",
        numero: 1,
        objetivo: "plaga",
        objetivoNombre: "Trips",
        incidenceGrade: 2,
        tipoControlId: "1",
        disolvente: "Agua",
        ingredientes: [{ localId: "i1", mezclaNumero: 2, tipoProductoId: "", modoAccionId: "", ingredienteActivoId: "", ingredienteActivoNombre: "", dosisProducto: "", marcaProductoNombre: "", concentracionProducto: "", unidadMedidaProducto: "", cantidadTotalProducto: "" }]
      };
      const mezclas: AppMezcla[] = [
        { localId: "m1", numero: 1, volumenAplicacion: "2", coadyuvantesIds: [], ordenMezcla: [], factor: "1", factorEditable: false },
        { localId: "m2", numero: 2, volumenAplicacion: "2", coadyuvantesIds: [], ordenMezcla: [], factor: "1", factorEditable: false }
      ];
      const result = deriveMezclaFactors([app], mezclas);
      expect(result[0].factor).toBe("1");
      expect(result[0].factorEditable).toBe(false);
    });

    it("factor 1.5 y editable para grado 3", () => {
      const app: AppFitosanidad = {
        localId: "a1",
        numero: 1,
        objetivo: "plaga",
        objetivoNombre: "Trips",
        incidenceGrade: 3,
        tipoControlId: "1",
        disolvente: "Agua",
        ingredientes: [{ localId: "i1", mezclaNumero: 1, tipoProductoId: "", modoAccionId: "", ingredienteActivoId: "", ingredienteActivoNombre: "", dosisProducto: "", marcaProductoNombre: "", concentracionProducto: "", unidadMedidaProducto: "", cantidadTotalProducto: "" }]
      };
      const mezclas: AppMezcla[] = [
        { localId: "m1", numero: 1, volumenAplicacion: "2", coadyuvantesIds: [], ordenMezcla: [], factor: "1", factorEditable: false }
      ];
      const result = deriveMezclaFactors([app], mezclas);
      expect(result[0].factor).toBe("1.5");
      expect(result[0].factorEditable).toBe(true);
    });

    it("mantiene factor manual cuando editable y grado 3", () => {
      const app: AppFitosanidad = {
        localId: "a1",
        numero: 1,
        objetivo: "enfermedad",
        objetivoNombre: "Oidio",
        incidenceGrade: 3,
        tipoControlId: "1",
        disolvente: "Agua",
        ingredientes: [{ localId: "i1", mezclaNumero: 1, tipoProductoId: "", modoAccionId: "", ingredienteActivoId: "", ingredienteActivoNombre: "", dosisProducto: "", marcaProductoNombre: "", concentracionProducto: "", unidadMedidaProducto: "", cantidadTotalProducto: "" }]
      };
      const mezclas: AppMezcla[] = [
        { localId: "m1", numero: 1, volumenAplicacion: "2", coadyuvantesIds: [], ordenMezcla: [], factor: "2", factorEditable: true }
      ];
      const result = deriveMezclaFactors([app], mezclas);
      expect(result[0].factor).toBe("2");
      expect(result[0].factorEditable).toBe(true);
    });
  });
});

describe("collectNomenclaturaPorMezcla", () => {
  it("agrupa nombres por mezcla sin duplicados", () => {
    const apps: AppFitosanidad[] = [
      {
        localId: "a1",
        numero: 1,
        objetivo: "plaga",
        objetivoNombre: "Trips",
        incidenceGrade: 1,
        tipoControlId: "1",
        disolvente: "Agua",
        ingredientes: [
          { localId: "i1", mezclaNumero: 1, tipoProductoId: "", modoAccionId: "", ingredienteActivoId: "", ingredienteActivoNombre: "Abamectina", dosisProducto: "", marcaProductoNombre: "Agrimec", concentracionProducto: "", unidadMedidaProducto: "", cantidadTotalProducto: "" }
        ]
      }
    ];
    const mezclas: AppMezcla[] = [
      { localId: "m1", numero: 1, volumenAplicacion: "", coadyuvantesIds: ["coad-1"], ordenMezcla: [], factor: "1", factorEditable: false },
      { localId: "m2", numero: 2, volumenAplicacion: "", coadyuvantesIds: [], ordenMezcla: [], factor: "1", factorEditable: false }
    ];
    const coadyuvantes = [{ id: "coad-1", name: "Adherente", description: null }];

    const result = collectNomenclaturaPorMezcla(apps, mezclas, coadyuvantes);
    expect(result).toHaveLength(2);
    expect(result[0].nombres).toContain("Agrimec");
    expect(result[0].nombres).toContain("Adherente");
    expect(result[1].nombres).toEqual([]);
  });
});
