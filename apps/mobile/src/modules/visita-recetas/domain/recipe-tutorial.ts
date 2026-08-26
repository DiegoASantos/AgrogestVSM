export type RecipeTutorialFieldId =
  | "fitosanidad"
  | "fitoControl"
  | "fitoIngredient"
  | "fitoBrand"
  | "fitoAction"
  | "fitoDose"
  | "fitoUnit"
  | "fertilizacion"
  | "fertilizationRoute"
  | "fertilizer"
  | "fertilizerDose"
  | "fertilizerAmount"
  | "riego"
  | "labores"
  | "continue";

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
  nextLabel: "Siguiente";
};

export type RecipeTutorialStep = TutorialStep<RecipeTutorialFieldId>;
export type MixtureTutorialStep = TutorialStep<MixtureTutorialFieldId>;

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

export function buildRecipeTutorialSteps(): RecipeTutorialStep[] {
  return [
    tutorialStep(
      "fitosanidad",
      "Recomendaciones fitosanitarias",
      "Abre la tarjeta de cada plaga o enfermedad. El tutorial te guiara campo por campo."
    ),
    tutorialStep(
      "fitoControl",
      "Tipo de control",
      "Selecciona el tipo de control recomendado para este objetivo."
    ),
    tutorialStep(
      "fitoIngredient",
      "Ingrediente activo",
      "Selecciona el ingrediente activo del catalogo disponible."
    ),
    tutorialStep(
      "fitoBrand",
      "Nombre comercial",
      "Selecciona el nombre comercial asociado al ingrediente activo."
    ),
    tutorialStep(
      "fitoAction",
      "Modo de accion",
      "Selecciona el modo de accion del producto."
    ),
    tutorialStep(
      "fitoDose",
      "Dosis fitosanitaria",
      "Escribe la dosis del producto comercial."
    ),
    tutorialStep(
      "fitoUnit",
      "Unidad de dosis",
      "Selecciona la unidad correspondiente a la dosis ingresada."
    ),
    tutorialStep(
      "fertilizacion",
      "Recomendaciones de fertilizacion",
      "Abre cada recomendacion nutricional para completar sus datos."
    ),
    tutorialStep(
      "fertilizationRoute",
      "Via de aplicacion",
      "Selecciona si el fertilizante se aplicara de forma edafica o foliar."
    ),
    tutorialStep(
      "fertilizer",
      "Fertilizante",
      "Selecciona el fertilizante desde el catalogo disponible."
    ),
    tutorialStep(
      "fertilizerDose",
      "Tipo, dosis y unidad",
      "Confirma el tipo de producto y completa la dosis con su unidad."
    ),
    tutorialStep(
      "fertilizerAmount",
      "Cantidad de aplicacion",
      "Completa plantas totales para via edafica o volumen para via foliar."
    ),
    tutorialStep(
      "riego",
      "Recomendacion de riego",
      "Si corresponde, abre esta seccion y marca una recomendacion. Es opcional y no bloquea las demas recomendaciones."
    ),
    tutorialStep(
      "labores",
      "Labores culturales",
      "Abre la seccion y selecciona las labores recomendadas para esta visita. Tambien es opcional."
    ),
    tutorialStep(
      "continue",
      "Continuar a mezclas",
      "Cuando hayas revisado las recomendaciones, pulsa este boton para guardar el borrador local y configurar las mezclas."
    )
  ];
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

export function getNextTutorialStep<Id extends string>(
  steps: TutorialStep<Id>[],
  currentId: Id
): TutorialStep<Id> | null {
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
