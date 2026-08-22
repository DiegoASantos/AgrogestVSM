import { describe, expect, it } from "vitest";

import {
  buildRecipeAccordionCards,
  findFirstRecipeDoseIssue,
  findFirstIncompleteRecipeCard,
  getFitosanidadCardKey,
  getMezclaCardKey,
  groupRecipeFertilizaciones,
  resolveRecipeCardAfterRemoval,
  toggleActiveRecipeCard
} from "./visita-receta-accordion";
import {
  createEmptyFertilizacion,
  createEmptyIngrediente,
  createEmptyMezcla,
  type AppFitosanidad
} from "./visita-receta-multiple-products";

function completeFitosanidad(localId: string): AppFitosanidad {
  return {
    localId,
    numero: 1,
    objetivo: "plaga",
    objetivoNombre: "Trips",
    enfoque: "reactivo",
    objetivoId: "target-1",
    incidenceGrade: 1,
    severityGrade: null,
    tipoControlId: "control-1",
    disolvente: "Agua",
    ingredientes: [
      {
        ...createEmptyIngrediente(1),
        tipoProductoId: "type-1",
        modoAccionId: "mode-1",
        ingredienteActivoNombre: "Abamectina",
        marcaProductoNombre: "Agrimec",
        dosisProducto: "250",
        unidadDosis: "ml/cilindro"
      }
    ]
  };
}

describe("acordeones de receta", () => {
  it("selecciona la primera tarjeta incompleta en orden visual", () => {
    const complete = completeFitosanidad("fito-complete");
    const incomplete = {
      ...completeFitosanidad("fito-incomplete"),
      tipoControlId: ""
    };
    const mezcla = { ...createEmptyMezcla(1), volumenAplicacion: "2" };

    const cards = buildRecipeAccordionCards([complete, incomplete], [mezcla], []);

    expect(findFirstIncompleteRecipeCard(cards)).toBe(
      getFitosanidadCardKey("fito-incomplete")
    );
  });

  it("deja todas cerradas cuando las tarjetas estan completas", () => {
    const fitosanidad = completeFitosanidad("fito-1");
    const mezcla = { ...createEmptyMezcla(1), volumenAplicacion: "2" };
    const fertilizacion = {
      ...createEmptyFertilizacion(),
      fertilizanteNombre: "Urea",
      dosis: "1",
      unidadDosis: "kg/planta",
      cantidadTotalPlantas: "100"
    };

    const cards = buildRecipeAccordionCards([fitosanidad], [mezcla], [fertilizacion]);

    expect(findFirstIncompleteRecipeCard(cards)).toBeNull();
  });

  it("conserva la activa si existe y busca otra cuando fue eliminada", () => {
    const incompleteMix = createEmptyMezcla(2);
    const cards = [
      { key: getMezclaCardKey("mix-1"), isComplete: true },
      { key: getMezclaCardKey(incompleteMix.localId), isComplete: false }
    ];

    expect(resolveRecipeCardAfterRemoval(getMezclaCardKey("mix-1"), cards)).toBe(
      getMezclaCardKey("mix-1")
    );
    expect(resolveRecipeCardAfterRemoval(getMezclaCardKey("removed"), cards)).toBe(
      getMezclaCardKey(incompleteMix.localId)
    );
  });

  it("mantiene una sola clave activa y permite cerrar la misma tarjeta", () => {
    const first = getFitosanidadCardKey("fito-1");
    const second = getMezclaCardKey("mix-1");

    expect(toggleActiveRecipeCard(first, second)).toBe(second);
    expect(toggleActiveRecipeCard(second, second)).toBeNull();
  });

  it("agrupa productos preventivos sin nutriente en una fertilizacion general", () => {
    const first = createEmptyFertilizacion("", {
      nutrienteId: null,
      nutrienteNombre: "",
      enfoque: "preventivo",
      incidenceGrade: 0
    });
    const second = createEmptyFertilizacion("", {
      nutrienteId: null,
      nutrienteNombre: "",
      enfoque: "preventivo",
      incidenceGrade: 0
    });

    expect(groupRecipeFertilizaciones([first, second])).toEqual([
      { key: "preventivo:general", productos: [first, second] }
    ]);
  });

  it("mantiene separados los registros reactivos historicos sin nutriente", () => {
    const first = createEmptyFertilizacion();
    const second = createEmptyFertilizacion();

    expect(groupRecipeFertilizaciones([first, second]).map((group) => group.key)).toEqual(
      [`legacy:${first.localId}`, `legacy:${second.localId}`]
    );
  });

  it("guia a la primera dosis faltante de un producto seleccionado", () => {
    const fitosanidad = completeFitosanidad("fito-1");
    const ingredient = fitosanidad.ingredientes[0]!;
    fitosanidad.ingredientes[0] = { ...ingredient, dosisProducto: "" };

    expect(findFirstRecipeDoseIssue([fitosanidad], [])).toMatchObject({
      cardKey: getFitosanidadCardKey("fito-1"),
      field: "dosis",
      fieldKey: `fitosanidad:fito-1:${ingredient.localId}:dosis`
    });
  });

  it("guia a la unidad faltante antes de validar fertilizantes posteriores", () => {
    const fitosanidad = completeFitosanidad("fito-1");
    const ingredient = fitosanidad.ingredientes[0]!;
    fitosanidad.ingredientes[0] = { ...ingredient, unidadDosis: "" };
    const fertilizacion = {
      ...createEmptyFertilizacion(),
      fertilizanteNombre: "Urea",
      dosis: "",
      unidadDosis: "kg/planta",
      cantidadTotalPlantas: "100"
    };

    expect(findFirstRecipeDoseIssue([fitosanidad], [fertilizacion])).toMatchObject({
      cardKey: getFitosanidadCardKey("fito-1"),
      field: "unidad",
      fieldKey: `fitosanidad:fito-1:${ingredient.localId}:unidad`
    });
  });

  it("requiere dosis positiva y unidad para cada fertilizante seleccionado", () => {
    const fertilizacion = {
      ...createEmptyFertilizacion(),
      fertilizanteNombre: "Urea",
      dosis: "0",
      unidadDosis: "kg/planta",
      cantidadTotalPlantas: "100"
    };

    expect(findFirstRecipeDoseIssue([], [fertilizacion])).toMatchObject({
      field: "dosis",
      fieldKey: `fertilizacion:${fertilizacion.localId}:dosis`
    });
  });
});
