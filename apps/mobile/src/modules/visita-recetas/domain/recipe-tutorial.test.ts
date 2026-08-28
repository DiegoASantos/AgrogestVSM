import { describe, expect, it } from "vitest";

import {
  buildMixtureTutorialSteps,
  buildRecipeTutorialSteps,
  getNextTutorialStep,
  recipeTutorialTarget,
  takePreviousTutorialStep
} from "./recipe-tutorial";

describe("tutorial de receta y mezclas", () => {
  it("recorre las secciones de receta en el orden de trabajo", () => {
    const steps = buildRecipeTutorialSteps({
      activeCardKey: null,
      openDropdown: null,
      hasLaborSelection: false,
      hasRiegoSelection: false,
      fitosanidad: [
        {
          cardKey: "fito:fito-1",
          localId: "fito-1",
          targetName: "Aranita roja",
          tipoControlId: "",
          ingredientes: [
            {
              localId: "producto-1",
              marcaProductoNombre: "",
              modoAccionId: "",
              dosisProducto: "",
              unidadDosis: ""
            }
          ]
        }
      ],
      fertilizacionGroups: [
        {
          cardKey: "fert:grupo-1",
          groupKey: "grupo-1",
          targetName: "Nitrogeno",
          productos: [
            {
              localId: "fert-1",
              viaAplicacion: "edafica",
              fertilizanteNombre: "",
              tipoProducto: "solido",
              dosis: "",
              unidadDosis: "",
              factor: "1",
              factorEditable: false,
              cantidadTotalPlantas: "",
              volumenAplicacion: ""
            }
          ]
        }
      ]
    });

    expect(steps.map((step) => step.id)).toEqual([
      recipeTutorialTarget.fitoCard("fito-1"),
      recipeTutorialTarget.fitoControl("fito-1"),
      recipeTutorialTarget.fitoBrand("fito-1", "producto-1"),
      recipeTutorialTarget.fitoAction("fito-1", "producto-1"),
      recipeTutorialTarget.fitoDose("fito-1", "producto-1"),
      recipeTutorialTarget.fitoUnit("fito-1", "producto-1"),
      recipeTutorialTarget.fertilizerCard("grupo-1"),
      recipeTutorialTarget.fertilizerRoute("fert-1"),
      recipeTutorialTarget.fertilizerProduct("fert-1"),
      recipeTutorialTarget.fertilizerType("fert-1"),
      recipeTutorialTarget.fertilizerDose("fert-1"),
      recipeTutorialTarget.fertilizerUnit("fert-1"),
      recipeTutorialTarget.fertilizerPlants("fert-1"),
      recipeTutorialTarget.riego,
      recipeTutorialTarget.labores,
      recipeTutorialTarget.continue
    ]);
    expect(getNextTutorialStep(steps, recipeTutorialTarget.fitoCard("fito-1"))?.id).toBe(
      recipeTutorialTarget.fitoControl("fito-1")
    );
    expect(steps.some((step) => step.title.includes("Ingrediente activo"))).toBe(false);
  });

  it("incluye la configuracion de mezcla solo si hay productos", () => {
    expect(buildMixtureTutorialSteps(true).map((step) => step.id)).toEqual(
      expect.arrayContaining([
        "products",
        "productDose",
        "productPlants",
        "applicationVolume",
        "coadyuvants",
        "coadyuvantDose",
        "preparationOrder",
        "reorder",
        "nextMixture"
      ])
    );
    expect(buildMixtureTutorialSteps(false).map((step) => step.id)).toEqual([
      "endTime",
      "finish"
    ]);
  });

  it("genera un recorrido independiente para cada tarjeta fitosanitaria", () => {
    const application = (localId: string) => ({
      cardKey: `fito:${localId}`,
      localId,
      targetName: localId,
      tipoControlId: "control",
      ingredientes: [
        {
          localId: `producto-${localId}`,
          marcaProductoNombre: "Marca",
          modoAccionId: "modo",
          dosisProducto: "1",
          unidadDosis: "ml/cilindro"
        }
      ]
    });
    const steps = buildRecipeTutorialSteps({
      activeCardKey: null,
      openDropdown: null,
      hasLaborSelection: false,
      hasRiegoSelection: false,
      fitosanidad: [application("fito-1"), application("fito-2")],
      fertilizacionGroups: []
    });

    expect(steps.map((step) => step.targetKey)).toEqual(
      expect.arrayContaining([
        recipeTutorialTarget.fitoCard("fito-1"),
        recipeTutorialTarget.fitoBrand("fito-1", "producto-fito-1"),
        recipeTutorialTarget.fitoCard("fito-2"),
        recipeTutorialTarget.fitoBrand("fito-2", "producto-fito-2")
      ])
    );
  });

  it("permite volver por el recorrido ya visitado", () => {
    expect(takePreviousTutorialStep(["products", "frequency"])).toEqual({
      previousId: "frequency",
      remainingHistory: ["products"]
    });
  });
});
