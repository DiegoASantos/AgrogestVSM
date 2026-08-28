export type RecipeTutorialFieldId = string;

export type MixtureTutorialFieldId =
  | "mixtureCount"
  | "mixtureSelection"
  | "products"
  | "productDose"
  | "productPlants"
  | "applicationVolume"
  | "frequency"
  | "coadyuvants"
  | "coadyuvantDose"
  | "preparationOrder"
  | "reorder"
  | "nextMixture"
  | "endTime"
  | "finish";

type TutorialStep<Id extends string> = {
  id: Id;
  title: string;
  instruction: string;
  isComplete: boolean;
  isEnabled: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  isOptional: boolean;
  nextLabel: string;
};

export type RecipeTutorialStep = TutorialStep<RecipeTutorialFieldId> & {
  targetKey: string;
  cardKey?: string;
  autoAdvanceWhenComplete?: boolean;
};
export type MixtureTutorialStep = TutorialStep<MixtureTutorialFieldId>;

export type RecipeTutorialInput = {
  activeCardKey: string | null;
  openDropdown: string | null;
  hasLaborSelection: boolean;
  hasRiegoSelection: boolean;
  fitosanidad: Array<{
    cardKey: string;
    localId: string;
    targetName: string;
    tipoControlId: string;
    ingredientes: Array<{
      localId: string;
      marcaProductoNombre: string;
      modoAccionId: string;
      dosisProducto: string;
      unidadDosis?: string;
    }>;
  }>;
  fertilizacionGroups: Array<{
    cardKey: string;
    groupKey: string;
    targetName: string;
    productos: Array<{
      localId: string;
      viaAplicacion: "edafica" | "foliar";
      fertilizanteNombre: string;
      tipoProducto: "solido" | "liquido";
      dosis: string;
      unidadDosis: string;
      factor: string;
      factorEditable: boolean;
      cantidadTotalPlantas: string;
      volumenAplicacion: string;
    }>;
  }>;
};

export const recipeTutorialTarget = {
  fitoCard: (applicationId: string) => `tutorial:fito:${applicationId}:card`,
  fitoControl: (applicationId: string) => `tutorial:fito:${applicationId}:control`,
  fitoBrand: (applicationId: string, ingredientId: string) =>
    `tutorial:fito:${applicationId}:${ingredientId}:brand`,
  fitoAction: (applicationId: string, ingredientId: string) =>
    `tutorial:fito:${applicationId}:${ingredientId}:action`,
  fitoDose: (applicationId: string, ingredientId: string) =>
    `tutorial:fito:${applicationId}:${ingredientId}:dose`,
  fitoUnit: (applicationId: string, ingredientId: string) =>
    `tutorial:fito:${applicationId}:${ingredientId}:unit`,
  fertilizerCard: (groupKey: string) => `tutorial:fert:${groupKey}:card`,
  fertilizerRoute: (productId: string) => `tutorial:fert:${productId}:route`,
  fertilizerProduct: (productId: string) => `tutorial:fert:${productId}:product`,
  fertilizerType: (productId: string) => `tutorial:fert:${productId}:type`,
  fertilizerDose: (productId: string) => `tutorial:fert:${productId}:dose`,
  fertilizerUnit: (productId: string) => `tutorial:fert:${productId}:unit`,
  fertilizerFactor: (productId: string) => `tutorial:fert:${productId}:factor`,
  fertilizerPlants: (productId: string) => `tutorial:fert:${productId}:plants`,
  fertilizerVolume: (productId: string) => `tutorial:fert:${productId}:volume`,
  riego: "tutorial:riego",
  labores: "tutorial:labores",
  continue: "tutorial:continue"
} as const;

const tutorialStep = <Id extends string>(
  id: Id,
  title: string,
  instruction: string
): TutorialStep<Id> => ({
  id,
  title,
  instruction,
  isComplete: false,
  isEnabled: true,
  isExpanded: false,
  isLoading: false,
  isOptional: true,
  nextLabel: "Siguiente"
});

export function buildRecipeTutorialSteps(
  input: RecipeTutorialInput
): RecipeTutorialStep[] {
  const steps: RecipeTutorialStep[] = [];

  const addField = (
    targetKey: string,
    cardKey: string,
    title: string,
    instruction: string,
    isComplete: boolean
  ) => {
    steps.push({
      ...tutorialStep(targetKey, title, instruction),
      cardKey,
      isComplete,
      isEnabled: input.activeCardKey === cardKey,
      isExpanded: input.openDropdown === targetKey,
      isOptional: false,
      targetKey
    });
  };

  input.fitosanidad.forEach((application, applicationIndex) => {
    const cardTarget = recipeTutorialTarget.fitoCard(application.localId);
    steps.push({
      ...tutorialStep(
        cardTarget,
        `Recomendacion ${applicationIndex + 1}: ${application.targetName}`,
        "Abre esta tarjeta para completar la recomendacion campo por campo."
      ),
      autoAdvanceWhenComplete: true,
      cardKey: application.cardKey,
      isComplete: input.activeCardKey === application.cardKey,
      isOptional: false,
      targetKey: cardTarget
    });

    addField(
      recipeTutorialTarget.fitoControl(application.localId),
      application.cardKey,
      "Tipo de control",
      "Selecciona el tipo de control recomendado para este objetivo.",
      Boolean(application.tipoControlId)
    );

    application.ingredientes.forEach((ingredient, ingredientIndex) => {
      const productLabel = `Producto ${ingredientIndex + 1}`;
      addField(
        recipeTutorialTarget.fitoBrand(application.localId, ingredient.localId),
        application.cardKey,
        `${productLabel}: nombre comercial`,
        "Selecciona el nombre comercial del producto. La creacion de catalogos no forma parte de este tutorial.",
        Boolean(ingredient.marcaProductoNombre.trim())
      );
      addField(
        recipeTutorialTarget.fitoAction(application.localId, ingredient.localId),
        application.cardKey,
        `${productLabel}: modo de accion`,
        "Selecciona el modo de accion del producto.",
        Boolean(ingredient.modoAccionId)
      );
      addField(
        recipeTutorialTarget.fitoDose(application.localId, ingredient.localId),
        application.cardKey,
        `${productLabel}: dosis`,
        "Ingresa una dosis mayor que cero para el producto comercial.",
        isPositiveNumber(ingredient.dosisProducto)
      );
      addField(
        recipeTutorialTarget.fitoUnit(application.localId, ingredient.localId),
        application.cardKey,
        `${productLabel}: unidad de dosis`,
        "Selecciona la unidad correspondiente a la dosis ingresada.",
        Boolean(ingredient.unidadDosis?.trim())
      );
    });
  });

  input.fertilizacionGroups.forEach((group, groupIndex) => {
    const cardTarget = recipeTutorialTarget.fertilizerCard(group.groupKey);
    steps.push({
      ...tutorialStep(
        cardTarget,
        `Fertilizacion ${groupIndex + 1}: ${group.targetName}`,
        "Abre esta tarjeta para completar cada producto de fertilizacion."
      ),
      autoAdvanceWhenComplete: true,
      cardKey: group.cardKey,
      isComplete: input.activeCardKey === group.cardKey,
      isOptional: false,
      targetKey: cardTarget
    });

    group.productos.forEach((product, productIndex) => {
      const productLabel = `Producto ${productIndex + 1}`;
      addField(
        recipeTutorialTarget.fertilizerRoute(product.localId),
        group.cardKey,
        `${productLabel}: via de aplicacion`,
        "Selecciona si la aplicacion sera edafica o foliar.",
        Boolean(product.viaAplicacion)
      );
      addField(
        recipeTutorialTarget.fertilizerProduct(product.localId),
        group.cardKey,
        `${productLabel}: fertilizante`,
        "Selecciona el fertilizante. La creacion de catalogos queda fuera del tutorial.",
        Boolean(product.fertilizanteNombre.trim())
      );
      addField(
        recipeTutorialTarget.fertilizerType(product.localId),
        group.cardKey,
        `${productLabel}: tipo de producto`,
        "Confirma si el producto es solido o liquido.",
        Boolean(product.tipoProducto)
      );
      addField(
        recipeTutorialTarget.fertilizerDose(product.localId),
        group.cardKey,
        `${productLabel}: dosis`,
        "Ingresa una dosis mayor que cero.",
        isPositiveNumber(product.dosis)
      );
      addField(
        recipeTutorialTarget.fertilizerUnit(product.localId),
        group.cardKey,
        `${productLabel}: unidad de dosis`,
        "Selecciona la unidad compatible con el tipo y la via de aplicacion.",
        Boolean(product.unidadDosis.trim())
      );
      if (product.factorEditable) {
        addField(
          recipeTutorialTarget.fertilizerFactor(product.localId),
          group.cardKey,
          `${productLabel}: factor de incidencia`,
          "Ingresa el factor indicado para esta recomendacion.",
          isPositiveNumber(product.factor)
        );
      }
      if (product.viaAplicacion === "edafica") {
        addField(
          recipeTutorialTarget.fertilizerPlants(product.localId),
          group.cardKey,
          `${productLabel}: cantidad de plantas`,
          "Ingresa la cantidad total de plantas que recibiran la aplicacion.",
          isPositiveNumber(product.cantidadTotalPlantas)
        );
      } else {
        addField(
          recipeTutorialTarget.fertilizerVolume(product.localId),
          group.cardKey,
          `${productLabel}: volumen de aplicacion`,
          "Ingresa el volumen total de aplicacion en cilindros por hectarea.",
          isPositiveNumber(product.volumenAplicacion)
        );
      }
    });
  });

  steps.push(
    {
      ...tutorialStep(
        recipeTutorialTarget.riego,
        "Recomendacion de riego",
        "Abre esta seccion y selecciona una recomendacion si corresponde. Puedes omitirla."
      ),
      isComplete: input.hasRiegoSelection,
      targetKey: recipeTutorialTarget.riego
    },
    {
      ...tutorialStep(
        recipeTutorialTarget.labores,
        "Labores culturales",
        "Abre esta seccion y selecciona las labores recomendadas. Puedes omitirla."
      ),
      isComplete: input.hasLaborSelection,
      targetKey: recipeTutorialTarget.labores
    },
    {
      ...tutorialStep(
        recipeTutorialTarget.continue,
        "Continuar a mezclas",
        "Al terminar la receta, pulsa Continuar a mezclas."
      ),
      isComplete: true,
      targetKey: recipeTutorialTarget.continue
    }
  );

  return steps;
}

function isPositiveNumber(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0;
}

export function buildMixtureTutorialSteps(hasProducts: boolean): MixtureTutorialStep[] {
  const steps: MixtureTutorialStep[] = [];

  if (hasProducts) {
    steps.push(
      tutorialStep(
        "mixtureCount",
        "Cantidad de mezclas",
        "Indica cuantas mezclas preparara y pulsa Aplicar. Puedes usar de 1 a 20 mezclas."
      ),
      tutorialStep(
        "mixtureSelection",
        "Elige una mezcla",
        "Selecciona una mezcla para configurarla de forma independiente. Su estado indica si aun faltan datos."
      ),
      tutorialStep(
        "products",
        "Productos de la mezcla",
        "Marca los productos de la receta que se usaran en esta mezcla."
      ),
      tutorialStep(
        "productDose",
        "Dosis por producto",
        "Completa la dosis de cada producto que hayas marcado."
      ),
      tutorialStep(
        "productPlants",
        "Cantidad de plantas",
        "Para productos de aplicacion edafica, ingresa la cantidad de plantas."
      ),
      tutorialStep(
        "applicationVolume",
        "Volumen de aplicacion",
        "Si la mezcla tiene productos foliares, ingresa el volumen en cilindros por hectarea."
      ),
      tutorialStep(
        "frequency",
        "Frecuencia y volumen",
        "Indica cada cuanto se aplicara la mezcla. Si contiene productos foliares, tambien completa el volumen de aplicacion."
      ),
      tutorialStep(
        "coadyuvants",
        "Coadyuvantes",
        "Marca los coadyuvantes que utilizara."
      ),
      tutorialStep(
        "coadyuvantDose",
        "Dosis de coadyuvantes",
        "Completa la dosis y unidad de cada coadyuvante seleccionado."
      ),
      tutorialStep(
        "preparationOrder",
        "Orden de preparacion",
        "Revisa que el agua este al inicio y los productos aparezcan en el orden correcto."
      ),
      tutorialStep(
        "reorder",
        "Reordenar productos",
        "Pulsa Reordenar y toca dos elementos para intercambiarlos. El agua permanece fija."
      ),
      tutorialStep(
        "nextMixture",
        "Siguiente mezcla",
        "Si configuraste mas de una mezcla, avanza para completar la siguiente de la misma forma."
      )
    );
  }

  steps.push(
    tutorialStep(
      "endTime",
      "Hora de fin",
      "Confirma la hora real de cierre de la visita. Este dato es obligatorio para finalizar."
    ),
    tutorialStep(
      "finish",
      "Finalizar visita",
      "Cuando todas las mezclas esten listas y la hora sea valida, pulsa Finalizar visita. El avance se guarda primero en este dispositivo."
    )
  );

  return steps;
}

export function getNextTutorialStep<Step extends TutorialStep<string>>(
  steps: Step[],
  currentId: Step["id"]
): Step | null {
  const currentIndex = steps.findIndex((step) => step.id === currentId);
  return steps[currentIndex + 1] ?? null;
}

export function takePreviousTutorialStep<Id extends string>(
  history: Id[]
): {
  previousId: Id | null;
  remainingHistory: Id[];
} {
  if (history.length === 0) {
    return { previousId: null, remainingHistory: [] };
  }

  return {
    previousId: history[history.length - 1] ?? null,
    remainingHistory: history.slice(0, -1)
  };
}
