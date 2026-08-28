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
      preventiveFitosanidad: {
        createdApplicationId: null,
        hasAvailableTargets: true,
        isExpanded: false,
        objectiveType: "plaga",
        targetId: ""
      },
      preventiveFertilization: {
        createdProductId: null,
        isExpanded: false,
        nutrientId: ""
      },
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
      recipeTutorialTarget.preventiveFitoCard,
      recipeTutorialTarget.fertilizerCard("grupo-1"),
      recipeTutorialTarget.fertilizerRoute("fert-1"),
      recipeTutorialTarget.fertilizerProduct("fert-1"),
      recipeTutorialTarget.fertilizerType("fert-1"),
      recipeTutorialTarget.fertilizerDose("fert-1"),
      recipeTutorialTarget.fertilizerUnit("fert-1"),
      recipeTutorialTarget.fertilizerPlants("fert-1"),
      recipeTutorialTarget.preventiveFertilizationCard,
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
      preventiveFitosanidad: {
        createdApplicationId: null,
        hasAvailableTargets: true,
        isExpanded: false,
        objectiveType: "plaga",
        targetId: ""
      },
      preventiveFertilization: {
        createdProductId: null,
        isExpanded: false,
        nutrientId: ""
      },
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

  it("presenta las dos altas preventivas como decisiones opcionales", () => {
    const steps = buildRecipeTutorialSteps({
      activeCardKey: null,
      openDropdown: null,
      hasLaborSelection: false,
      hasRiegoSelection: false,
      preventiveFitosanidad: {
        createdApplicationId: null,
        hasAvailableTargets: true,
        isExpanded: false,
        objectiveType: "plaga",
        targetId: ""
      },
      preventiveFertilization: {
        createdProductId: null,
        isExpanded: false,
        nutrientId: ""
      },
      fitosanidad: [],
      fertilizacionGroups: []
    });

    expect(steps.map((step) => step.id)).toEqual([
      recipeTutorialTarget.preventiveFitoCard,
      recipeTutorialTarget.preventiveFertilizationCard,
      recipeTutorialTarget.riego,
      recipeTutorialTarget.labores,
      recipeTutorialTarget.continue
    ]);
    expect(
      steps.find((step) => step.id === recipeTutorialTarget.preventiveFitoCard)
    ).toMatchObject({ isComplete: false, isOptional: true });
    expect(
      steps.find((step) => step.id === recipeTutorialTarget.preventiveFertilizationCard)
    ).toMatchObject({ isComplete: false, isOptional: true });
  });

  it("guia los campos de las altas preventivas cuando sus cards se abren", () => {
    const steps = buildRecipeTutorialSteps({
      activeCardKey: null,
      openDropdown: null,
      hasLaborSelection: false,
      hasRiegoSelection: false,
      preventiveFitosanidad: {
        createdApplicationId: null,
        hasAvailableTargets: true,
        isExpanded: true,
        objectiveType: "plaga",
        targetId: "objetivo-1"
      },
      preventiveFertilization: {
        createdProductId: null,
        isExpanded: true,
        nutrientId: ""
      },
      fitosanidad: [],
      fertilizacionGroups: []
    });

    expect(steps.map((step) => step.id)).toEqual([
      recipeTutorialTarget.preventiveFitoCard,
      recipeTutorialTarget.preventiveFitoType,
      recipeTutorialTarget.preventiveFitoTarget,
      recipeTutorialTarget.preventiveFitoAdd,
      recipeTutorialTarget.preventiveFertilizationCard,
      recipeTutorialTarget.preventiveFertilizationNutrient,
      recipeTutorialTarget.preventiveFertilizationAdd,
      recipeTutorialTarget.riego,
      recipeTutorialTarget.labores,
      recipeTutorialTarget.continue
    ]);
    expect(
      steps.find((step) => step.id === recipeTutorialTarget.preventiveFitoTarget)
    ).toMatchObject({ isComplete: true, isOptional: false });
    expect(
      steps.find(
        (step) => step.id === recipeTutorialTarget.preventiveFertilizationNutrient
      )
    ).toMatchObject({ isComplete: false, isOptional: true });
  });

  it("coloca el producto preventivo creado despues de su alta sin duplicarlo", () => {
    const createdApplication = {
      cardKey: "fito:fito-preventiva",
      localId: "fito-preventiva",
      targetName: "Oidiosis",
      tipoControlId: "control",
      ingredientes: [
        {
          localId: "producto-preventivo",
          marcaProductoNombre: "",
          modoAccionId: "",
          dosisProducto: "",
          unidadDosis: ""
        }
      ]
    };
    const steps = buildRecipeTutorialSteps({
      activeCardKey: createdApplication.cardKey,
      openDropdown: null,
      hasLaborSelection: false,
      hasRiegoSelection: false,
      preventiveFitosanidad: {
        createdApplicationId: createdApplication.localId,
        hasAvailableTargets: true,
        isExpanded: false,
        objectiveType: "plaga",
        targetId: ""
      },
      preventiveFertilization: {
        createdProductId: null,
        isExpanded: false,
        nutrientId: ""
      },
      fitosanidad: [createdApplication],
      fertilizacionGroups: []
    });

    expect(steps.map((step) => step.id).slice(0, 3)).toEqual([
      recipeTutorialTarget.preventiveFitoCard,
      recipeTutorialTarget.fitoCard(createdApplication.localId),
      recipeTutorialTarget.fitoControl(createdApplication.localId)
    ]);
    expect(
      steps.filter(
        (step) => step.id === recipeTutorialTarget.fitoCard(createdApplication.localId)
      )
    ).toHaveLength(1);
  });

  it("recorre solo el fertilizante creado aunque se agregue a un grupo existente", () => {
    const product = (localId: string) => ({
      localId,
      viaAplicacion: "edafica" as const,
      fertilizanteNombre: localId === "fert-nueva" ? "" : "Compost",
      tipoProducto: "solido" as const,
      dosis: localId === "fert-nueva" ? "" : "1",
      unidadDosis: localId === "fert-nueva" ? "" : "kg/planta",
      factor: "1",
      factorEditable: false,
      cantidadTotalPlantas: localId === "fert-nueva" ? "" : "10",
      volumenAplicacion: ""
    });
    const steps = buildRecipeTutorialSteps({
      activeCardKey: "fert:general",
      openDropdown: null,
      hasLaborSelection: false,
      hasRiegoSelection: false,
      preventiveFitosanidad: {
        createdApplicationId: null,
        hasAvailableTargets: false,
        isExpanded: false,
        objectiveType: "plaga",
        targetId: ""
      },
      preventiveFertilization: {
        createdProductId: "fert-nueva",
        isExpanded: false,
        nutrientId: ""
      },
      fitosanidad: [],
      fertilizacionGroups: [
        {
          cardKey: "fert:general",
          groupKey: "general",
          targetName: "Fertilizacion general",
          productos: [product("fert-existente"), product("fert-nueva")]
        }
      ]
    });

    const ids = steps.map((step) => step.id);
    expect(ids.indexOf(recipeTutorialTarget.preventiveFertilizationCard)).toBeLessThan(
      ids.indexOf(recipeTutorialTarget.preventiveFertilizationCreatedCard("fert-nueva"))
    );
    expect(
      steps.filter(
        (step) => step.id === recipeTutorialTarget.fertilizerRoute("fert-nueva")
      )
    ).toHaveLength(1);
    expect(
      steps.find(
        (step) =>
          step.id ===
          recipeTutorialTarget.preventiveFertilizationCreatedCard("fert-nueva")
      )
    ).toMatchObject({ targetKey: recipeTutorialTarget.fertilizerCard("general") });
  });

  it("mantiene omisible la prevencion fitosanitaria sin objetivos disponibles", () => {
    const steps = buildRecipeTutorialSteps({
      activeCardKey: null,
      openDropdown: null,
      hasLaborSelection: false,
      hasRiegoSelection: false,
      preventiveFitosanidad: {
        createdApplicationId: null,
        hasAvailableTargets: false,
        isExpanded: true,
        objectiveType: "plaga",
        targetId: ""
      },
      preventiveFertilization: {
        createdProductId: null,
        isExpanded: false,
        nutrientId: ""
      },
      fitosanidad: [],
      fertilizacionGroups: []
    });

    expect(
      steps.some((step) => step.id === recipeTutorialTarget.preventiveFitoType)
    ).toBe(false);
    expect(steps[0]).toMatchObject({ isComplete: false, isOptional: true });
  });

  it("permite volver por el recorrido ya visitado", () => {
    expect(takePreviousTutorialStep(["products", "frequency"])).toEqual({
      previousId: "frequency",
      remainingHistory: ["products"]
    });
  });
});
