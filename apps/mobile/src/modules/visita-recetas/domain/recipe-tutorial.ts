export type RecipeTutorialFieldId =
  | "fitosanidad"
  | "fertilizacion"
  | "riego"
  | "labores"
  | "continue";

export type MixtureTutorialFieldId =
  | "mixtureCount"
  | "mixtureSelection"
  | "products"
  | "frequency"
  | "coadyuvants"
  | "preparationOrder"
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
      "Abre cada tarjeta de plaga o enfermedad y completa tipo de control, producto, dosis y unidad. Puedes agregar otro producto cuando sea necesario."
    ),
    tutorialStep(
      "fertilizacion",
      "Recomendaciones de fertilizacion",
      "Abre cada deficiencia para indicar via de aplicacion, fertilizante, dosis y unidad. La cantidad total se calcula con los datos ingresados."
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
        "Marca los productos de la receta que se usaran en esta mezcla. Al seleccionarlos, completa su dosis y las plantas cuando aplique."
      ),
      tutorialStep(
        "frequency",
        "Frecuencia y volumen",
        "Indica cada cuanto se aplicara la mezcla. Si contiene productos foliares, tambien completa el volumen de aplicacion."
      ),
      tutorialStep(
        "coadyuvants",
        "Coadyuvantes",
        "Marca los coadyuvantes que utilizara. Cada uno seleccionado requiere su dosis con unidad."
      ),
      tutorialStep(
        "preparationOrder",
        "Orden de preparacion",
        "El agua queda fija al inicio. Usa Reordenar para intercambiar los demas elementos si necesitas cambiar el orden."
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
