import type { NewVisitaCampoFormValues } from "../types";

export type StepOneTutorialFieldId =
  | "crop"
  | "variety"
  | "plantsCount"
  | "areaHectares"
  | "sowingDate"
  | "startVisitTime"
  | "phenologicalStage"
  | "subEtapaPercentage"
  | "generalObservation";

export type StepOneTutorialStep = {
  id: StepOneTutorialFieldId;
  title: string;
  instruction: string;
  isComplete: boolean;
  isEnabled: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  isOptional: boolean;
};

type BuildStepOneTutorialStepsInput = {
  values: NewVisitaCampoFormValues;
  today: string;
  activeCatalog: "crop" | "variety" | "phenologicalStage" | "sowingDate" | null;
  isLoadingCultivos: boolean;
  isLoadingVariedades: boolean;
  isLoadingEtapasFenologicas: boolean;
  isLoadingProgress: boolean;
  showProgress: boolean;
};

export type RequiredFieldIssue = "missing" | "invalid" | null;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export function getPlantsCountIssue(value: string): RequiredFieldIssue {
  const normalized = value.trim();
  if (!normalized) {
    return "missing";
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed >= 0 ? null : "invalid";
}

export function getAreaHectaresIssue(value: string): RequiredFieldIssue {
  const normalized = value.trim();
  if (!normalized) {
    return "missing";
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? null : "invalid";
}

export function getSowingDateIssue(value: string, today: string): RequiredFieldIssue {
  const normalized = value.trim();
  if (!normalized) {
    return "missing";
  }

  return ISO_DATE_PATTERN.test(normalized) && normalized <= today ? null : "invalid";
}

export function mergeStepOneFormValues(
  base: NewVisitaCampoFormValues,
  candidate: unknown,
  overrides: Partial<NewVisitaCampoFormValues> = {}
): NewVisitaCampoFormValues {
  const source = isRecord(candidate) ? candidate : {};
  const read = (key: keyof NewVisitaCampoFormValues) =>
    typeof source[key] === "string" ? source[key] : base[key];

  return {
    crop: read("crop"),
    variety: read("variety"),
    parcelaId: read("parcelaId"),
    parcelaLabel: read("parcelaLabel"),
    campaign: read("campaign"),
    plantsCount: read("plantsCount"),
    areaHectares: read("areaHectares"),
    sowingDate: read("sowingDate"),
    visitDate: read("visitDate"),
    startVisitTime: read("startVisitTime"),
    phenologicalStage: read("phenologicalStage"),
    subEtapaId: read("subEtapaId"),
    subEtapaPercentage: read("subEtapaPercentage"),
    generalObservation: read("generalObservation"),
    ...overrides
  };
}

export function buildStepOneTutorialSteps({
  values,
  today,
  activeCatalog,
  isLoadingCultivos,
  isLoadingVariedades,
  isLoadingEtapasFenologicas,
  isLoadingProgress,
  showProgress
}: BuildStepOneTutorialStepsInput): StepOneTutorialStep[] {
  const steps: StepOneTutorialStep[] = [
    {
      id: "crop",
      title: "Cultivo",
      instruction:
        activeCatalog === "crop"
          ? "Selecciona el cultivo observado en la lista."
          : "Despliega la lista para seleccionar el cultivo observado.",
      isComplete: !!values.crop.trim(),
      isEnabled: !isLoadingCultivos,
      isExpanded: activeCatalog === "crop",
      isLoading: isLoadingCultivos,
      isOptional: false
    },
    {
      id: "variety",
      title: "Variedad",
      instruction:
        activeCatalog === "variety"
          ? "Selecciona la variedad correspondiente al cultivo."
          : "Despliega la lista y selecciona la variedad del cultivo.",
      isComplete: !!values.variety.trim(),
      isEnabled: !!values.crop && !isLoadingVariedades,
      isExpanded: activeCatalog === "variety",
      isLoading: isLoadingVariedades,
      isOptional: false
    },
    {
      id: "plantsCount",
      title: "Numero de plantas",
      instruction: "Escribe la cantidad total de plantas de la parcela.",
      isComplete: getPlantsCountIssue(values.plantsCount) === null,
      isEnabled: true,
      isExpanded: false,
      isLoading: false,
      isOptional: false
    },
    {
      id: "areaHectares",
      title: "Area de la parcela",
      instruction: "Escribe el area cultivada en hectareas. Debe ser mayor que cero.",
      isComplete: getAreaHectaresIssue(values.areaHectares) === null,
      isEnabled: true,
      isExpanded: false,
      isLoading: false,
      isOptional: false
    },
    {
      id: "sowingDate",
      title: "Fecha de siembra",
      instruction:
        activeCatalog === "sowingDate"
          ? "Selecciona en el calendario la fecha de siembra."
          : "Abre el calendario y selecciona la fecha de siembra.",
      isComplete: getSowingDateIssue(values.sowingDate, today) === null,
      isEnabled: true,
      isExpanded: activeCatalog === "sowingDate",
      isLoading: false,
      isOptional: false
    },
    {
      id: "startVisitTime",
      title: "Hora de inicio",
      instruction: "Escribe la hora en formato de 12 horas y confirma AM o PM.",
      isComplete: TIME_PATTERN.test(values.startVisitTime.trim()),
      isEnabled: true,
      isExpanded: false,
      isLoading: false,
      isOptional: false
    },
    {
      id: "phenologicalStage",
      title: "Etapa fenologica",
      instruction:
        activeCatalog === "phenologicalStage"
          ? "Selecciona la etapa actual del cultivo."
          : "Despliega la lista y selecciona la etapa actual del cultivo.",
      isComplete: !!values.phenologicalStage.trim(),
      isEnabled: !!values.crop && !isLoadingEtapasFenologicas,
      isExpanded: activeCatalog === "phenologicalStage",
      isLoading: isLoadingEtapasFenologicas,
      isOptional: false
    }
  ];

  if (showProgress) {
    const progress = Number(values.subEtapaPercentage);
    steps.push({
      id: "subEtapaPercentage",
      title: "Avance de la etapa",
      instruction: "Mueve el control hasta representar el avance observado en campo.",
      isComplete:
        values.subEtapaPercentage.trim().length > 0 &&
        Number.isFinite(progress) &&
        progress >= 0 &&
        progress <= 100 &&
        progress % 5 === 0,
      isEnabled: !isLoadingProgress,
      isExpanded: false,
      isLoading: isLoadingProgress,
      isOptional: false
    });
  }

  steps.push({
    id: "generalObservation",
    title: "Observacion general",
    instruction: "Escribe una observacion util de la visita o pulsa Omitir.",
    isComplete: !!values.generalObservation.trim(),
    isEnabled: true,
    isExpanded: false,
    isLoading: false,
    isOptional: true
  });

  return steps;
}

export function findFirstPendingTutorialStep(
  steps: StepOneTutorialStep[]
): StepOneTutorialStep | null {
  return steps.find((step) => !step.isComplete) ?? null;
}

export function findNextPendingTutorialStep(
  steps: StepOneTutorialStep[],
  currentId: StepOneTutorialFieldId
): StepOneTutorialStep | null {
  const currentIndex = steps.findIndex((step) => step.id === currentId);
  if (currentIndex < 0) {
    return findFirstPendingTutorialStep(steps);
  }

  return steps.slice(currentIndex + 1).find((step) => !step.isComplete) ?? null;
}

export function takePreviousTutorialStep(history: StepOneTutorialFieldId[]): {
  previousId: StepOneTutorialFieldId | null;
  remainingHistory: StepOneTutorialFieldId[];
} {
  if (history.length === 0) {
    return { previousId: null, remainingHistory: [] };
  }

  return {
    previousId: history[history.length - 1] ?? null,
    remainingHistory: history.slice(0, -1)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
