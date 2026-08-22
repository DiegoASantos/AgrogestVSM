import { resolveDiseaseIncidenceGrade } from "../../observaciones-sanitarias/domain/disease-incidence";
import { resolveNutritionIncidence } from "../../evaluaciones/domain/nutrition-incidence";
import type {
  DiseaseModuleTechnicalDetail,
  LaborModuleTechnicalDetail,
  MobileTechnicalScoreDetails,
  NutritionModuleTechnicalDetail,
  PestModuleTechnicalDetail,
  RiegoModuleTechnicalDetail
} from "../types";

type SanitaryObservationInput = {
  pestDiseaseId: string;
  code: string | null;
  name: string;
  type: string;
  incidenceGrade: number;
  severityGrade: number;
  incidencePercentage: number;
};

type NutritionObservationInput = {
  nutrientId: string | null;
  code: string | null;
  name: string;
  description: string;
  incidencePercentage: number;
};

export type LocalTechnicalScoreInput = {
  technicalScoreVersion: 1 | 2;
  isActive: boolean;
  hasRecipe: boolean;
  finalizedSteps: number[];
  departmentCode: string | null;
  sanitaryObservations: SanitaryObservationInput[];
  nutritionObservations: NutritionObservationInput[];
  riego: {
    humedadSuelo: string | null;
    estresHidrico: boolean | null;
  } | null;
  labores: Array<{
    categoryCode: string | null;
    categoryName: string | null;
    optionCode: string | null;
    optionName: string | null;
  }>;
};

const PEST_DEFINITIONS_V1 = [
  { key: "trips", name: "Trips", aliases: ["trips", "thrips"] },
  { key: "queresas", name: "Queresas", aliases: ["queresa", "queresas"] },
  { key: "acaros", name: "Ácaros", aliases: ["acaro", "acaros"] },
  {
    key: "cochinilla",
    name: "Cochinilla",
    aliases: ["cochinilla", "cochinillas"]
  },
  { key: "chinche", name: "Chinche", aliases: ["chinche", "chinches"] },
  {
    key: "mosca_fruta",
    name: "Mosca de la fruta",
    aliases: ["mosca de la fruta", "mosca fruta"]
  }
] as const;

const PEST_DEFINITIONS_V2 = [
  ...PEST_DEFINITIONS_V1,
  { key: "aranita_roja", name: "Arañita roja", aliases: ["aranita roja"] },
  { key: "mosca_blanca", name: "Mosca blanca", aliases: ["mosca blanca"] },
  {
    key: "gusano_barrenador",
    name: "Gusano barrenador",
    aliases: ["gusano barrenador"]
  },
  {
    key: "hormiga_arriera",
    name: "Hormiga arriera",
    aliases: ["hormiga arriera"]
  }
] as const;

const DISEASE_DEFINITIONS_V1 = [
  { key: "oidium", name: "Oidium", aliases: ["oidium", "oidio"] },
  { key: "antracnosis", name: "Antracnosis", aliases: ["antracnosis"] },
  {
    key: "muerte_regresiva",
    name: "Muerte regresiva",
    aliases: ["muerte regresiva"]
  },
  { key: "alternaria", name: "Alternaria", aliases: ["alternaria"] }
] as const;

const DISEASE_DEFINITIONS_V2 = [
  ...DISEASE_DEFINITIONS_V1,
  { key: "fusariosis", name: "Fusariosis", aliases: ["fusariosis"] },
  { key: "botritis", name: "Botritis", aliases: ["botritis"] },
  { key: "fumagina", name: "Fumagina", aliases: ["fumagina"] }
] as const;

const NUTRITION_DEFINITIONS = [
  { key: "nitrogeno", name: "Nitrógeno" },
  { key: "magnesio", name: "Magnesio" },
  { key: "potasio", name: "Potasio" },
  { key: "hierro", name: "Hierro" },
  { key: "zinc", name: "Zinc" },
  { key: "boro", name: "Boro" },
  { key: "calcio", name: "Calcio" },
  { key: "fosforo", name: "Fósforo" }
] as const;

export function calculateLocalTechnicalScores(
  input: LocalTechnicalScoreInput
): MobileTechnicalScoreDetails {
  return {
    detallePlagas: calculatePestDetail(input),
    detalleEnfermedades: calculateDiseaseDetail(input),
    detalleNutricion: calculateNutritionDetail(input),
    detalleRiego: calculateRiegoDetail(input),
    detalleLabores: calculateLaborDetail(input)
  };
}

function calculatePestDetail(
  input: LocalTechnicalScoreInput
): PestModuleTechnicalDetail | null {
  if (!input.isActive || (!input.hasRecipe && !input.finalizedSteps.includes(2))) {
    return null;
  }
  const rows = input.sanitaryObservations.filter(
    (observation) => observation.type.toLowerCase() === "plaga"
  );
  const pestDefinitions =
    input.technicalScoreVersion === 2 ? PEST_DEFINITIONS_V2 : PEST_DEFINITIONS_V1;
  const pestScores = pestDefinitions.map((definition) => {
    const row = rows.find((observation) => matchesDefinition(observation, definition));
    const incidenceGrade = row?.incidenceGrade ?? 0;
    const severityGrade = row?.severityGrade ?? 0;
    const specialRule = resolveFlySpecialRule(
      definition.key,
      incidenceGrade,
      severityGrade,
      input.departmentCode
    );
    const score = specialRule ? 0 : 3 - Math.max(incidenceGrade, severityGrade);
    return {
      key: definition.key,
      pestDiseaseId: row?.pestDiseaseId ?? null,
      name: definition.name,
      evaluated: Boolean(row),
      incidenceGrade,
      severityGrade,
      score,
      formula: specialRule
        ? `${specialRule} ⇒ nota 0`
        : `3 - MAX(${incidenceGrade}, ${severityGrade}) = ${score}`,
      specialRule
    };
  });
  const moduleScore = Math.min(...pestScores.map((item) => item.score));
  const semaphore = resolvePestSemaphore(moduleScore);
  return {
    moduleFormula:
      input.technicalScoreVersion === 2
        ? `MIN(${pestDefinitions.map((item) => `nota de ${item.name}`).join(", ")})`
        : "MIN(nota de Trips, nota de Queresas, nota de Ácaros, nota de Cochinilla, nota de Chinche, nota de Mosca de la fruta)",
    appliedFormula: `MIN(${pestScores.map((item) => item.score).join(", ")}) = ${moduleScore}`,
    moduleScore,
    modulePercentage: percentage(moduleScore),
    ...semaphore,
    pestScores
  };
}

function calculateDiseaseDetail(
  input: LocalTechnicalScoreInput
): DiseaseModuleTechnicalDetail | null {
  if (!input.isActive || (!input.hasRecipe && !input.finalizedSteps.includes(3))) {
    return null;
  }
  const rows = input.sanitaryObservations.filter(
    (observation) => observation.type.toLowerCase() === "enfermedad"
  );
  const diseaseDefinitions =
    input.technicalScoreVersion === 2 ? DISEASE_DEFINITIONS_V2 : DISEASE_DEFINITIONS_V1;
  const diseaseScores = diseaseDefinitions.map((definition) => {
    const row = rows.find((observation) => matchesDefinition(observation, definition));
    const incidencePercentage = row?.incidencePercentage ?? 0;
    const incidenceGrade = resolveDiseaseIncidenceGrade(incidencePercentage);
    const severityGrade = row?.severityGrade ?? 0;
    const score = 3 - Math.max(incidenceGrade, severityGrade);
    return {
      key: definition.key,
      pestDiseaseId: row?.pestDiseaseId ?? null,
      name: definition.name,
      evaluated: Boolean(row),
      incidencePercentage,
      incidenceGrade,
      severityGrade,
      score,
      formula: `3 - MAX(${incidenceGrade}, ${severityGrade}) = ${score}`
    };
  });
  const moduleScore = Math.min(...diseaseScores.map((item) => item.score));
  const semaphore = resolveDiseaseSemaphore(moduleScore);
  return {
    moduleFormula:
      input.technicalScoreVersion === 2
        ? `MIN(${diseaseDefinitions.map((item) => `nota de ${item.name}`).join(", ")})`
        : "MIN(nota de Oidium, nota de Antracnosis, nota de Muerte regresiva, nota de Alternaria)",
    appliedFormula: `MIN(${diseaseScores.map((item) => item.score).join(", ")}) = ${moduleScore}`,
    moduleScore,
    modulePercentage: percentage(moduleScore),
    ...semaphore,
    diseaseScores
  };
}

function calculateNutritionDetail(
  input: LocalTechnicalScoreInput
): NutritionModuleTechnicalDetail | null {
  if (!input.isActive || (!input.hasRecipe && !input.finalizedSteps.includes(4))) {
    return null;
  }
  const nutritionScores = NUTRITION_DEFINITIONS.map((definition) => {
    const row = input.nutritionObservations.find(
      (observation) => resolveNutritionKey(observation) === definition.key
    );
    const incidencePercentage = row?.incidencePercentage ?? 0;
    const incidenceGrade = resolveNutritionIncidence(incidencePercentage).grade;
    const score = 3 - incidenceGrade;
    return {
      key: definition.key,
      nutrientId: row?.nutrientId ?? null,
      name: definition.name,
      evaluated: Boolean(row),
      incidencePercentage,
      incidenceGrade,
      score,
      formula: `NotaNutricion = 3 - ${incidenceGrade} = ${score}`
    };
  });
  const moduleScore = Math.min(...nutritionScores.map((item) => item.score));
  const semaphore = resolveNutritionSemaphore(moduleScore);
  return {
    moduleFormula:
      "ScoreNutricion = MIN(nota de Nitrógeno, nota de Magnesio, nota de Potasio, nota de Hierro, nota de Zinc, nota de Boro, nota de Calcio, nota de Fósforo)",
    appliedFormula: `ScoreNutricion = MIN(${nutritionScores.map((item) => item.score).join(", ")}) = ${moduleScore}`,
    moduleScore,
    modulePercentage: percentage(moduleScore),
    ...semaphore,
    nutritionScores
  };
}

function calculateRiegoDetail(
  input: LocalTechnicalScoreInput
): RiegoModuleTechnicalDetail | null {
  if (!input.riego) {
    if (!input.hasRecipe) return null;
    return buildRiegoDetail(3);
  }
  if (!input.riego.humedadSuelo || input.riego.estresHidrico === null) return null;
  const scores = input.riego.estresHidrico
    ? { seco: 3, moderadamente_seco: 2, optimo: 1, saturado: 0 }
    : { optimo: 3, moderadamente_seco: 2, saturado: 1, seco: 0 };
  const moduleScore = scores[input.riego.humedadSuelo as keyof typeof scores];
  return moduleScore === undefined ? null : buildRiegoDetail(moduleScore);
}

function buildRiegoDetail(moduleScore: number): RiegoModuleTechnicalDetail {
  const semaphore: RiegoModuleTechnicalDetail["semaphore"] =
    moduleScore <= 1 ? "rojo" : moduleScore === 2 ? "amarillo" : "verde";
  if (moduleScore <= 1) {
    return {
      moduleScore,
      modulePercentage: percentage(moduleScore),
      semaphore,
      status:
        "Alerta critica en el sistema de riego, desviacion grave detectada en la humedad del suelo.",
      message:
        "El estado actual arruina el llenado del fruto, las raices o sabotea la induccion floral del cultivo de exportacion. Corregir los turnos o valvulas de inmediato."
    };
  }
  if (moduleScore === 2) {
    return {
      moduleScore,
      modulePercentage: percentage(moduleScore),
      semaphore,
      status: "Suelo Entrando en desecacion moderada",
      message:
        "El sistema requiere la programacion fisica de un turno regular en las proximas horas para evitar el estres del cultivo."
    };
  }
  return {
    moduleScore,
    modulePercentage: percentage(moduleScore),
    semaphore,
    status: "Manejo de Riego Excelente",
    message:
      "Estrategia hidrica en estado optimo. Se cumplen los objetivos agronomicos de la etapa fenologica actual."
  };
}

function matchesDefinition(
  observation: SanitaryObservationInput,
  definition: { key: string; aliases: readonly string[] }
) {
  const code = normalize(observation.code ?? "").replaceAll(" ", "_");
  return (
    code === definition.key ||
    (definition.aliases as readonly string[]).includes(normalize(observation.name))
  );
}

function resolveNutritionKey(observation: NutritionObservationInput) {
  if (observation.code) return normalize(observation.code).replaceAll(" ", "_");
  if (observation.name) return normalize(observation.name).replaceAll(" ", "_");
  const name = observation.description.slice("Nutricion -".length).split(":", 1)[0];
  return normalize(name).replaceAll(" ", "_");
}

function resolveFlySpecialRule(
  pestKey: string,
  incidence: number,
  severity: number,
  departmentCode: string | null
) {
  if (pestKey !== "mosca_fruta") return null;
  if (severity >= 1) return "Regla Mosca de la fruta: severidad ≥ 1";
  if (departmentCode === "14" && incidence === 3)
    return "Regla Mosca de la fruta: Lambayeque e incidencia 3";
  if (departmentCode === "20" && incidence >= 2)
    return "Regla Mosca de la fruta: Piura e incidencia ≥ 2";
  return null;
}

function resolvePestSemaphore(score: number) {
  if (score === 0)
    return {
      semaphore: "rojo" as const,
      status: "Emergencia en Campo",
      message: "¡Emergencia Fitosanitaria! Alta población o daño crítico."
    };
  if (score === 1)
    return {
      semaphore: "amarillo" as const,
      status: "Alerta / Umbral de Intervención",
      message:
        "Umbral de acción alcanzado en uno o más insectos. Programar lavado de árboles y aplicación dirigida de aceites agrícolas, jabones potásicos o insecticidas específicos de bajo impacto."
    };
  return {
    semaphore: "verde" as const,
    status: "Salud Fitosanitaria Alta/Buena",
    message:
      "Poblaciones bajo control. Continuar con el monitoreo semanal planificado y la liberación de controladores biológicos (crisopas/avispitas)."
  };
}

function resolveDiseaseSemaphore(score: number) {
  if (score === 0)
    return {
      semaphore: "rojo" as const,
      status: "Crisis Sanitaria",
      message:
        "¡Crisis Fitosanitaria! Infección severa o dispersión masiva detectada. Alto riesgo de pérdida total de flores o rechazo absoluto del lote para exportación. Aplicar control químico de choque."
    };
  if (score === 1)
    return {
      semaphore: "amarillo" as const,
      status: "Alerta / Umbral de Acción",
      message:
        "Umbral de daño alcanzado. Se requiere la aplicación inmediata de fungicidas específicos o la ejecución de podas sanitarias de urgencia (para frenar puntas secas)."
    };
  return {
    semaphore: "verde" as const,
    status: "Lote Sano / Control Eficiente",
    message:
      "Sanidad vegetal óptima. Continuar con el programa de aplicaciones preventivas antes de floración y tras el cuajado."
  };
}

function resolveNutritionSemaphore(score: number) {
  if (score === 0)
    return {
      semaphore: "rojo" as const,
      status: "Deficiencia Crítica / Riesgo de Rendimiento",
      message:
        "¡Alerta Crítica de Nutrición! Más del 20% del lote presenta síntomas severos. Pérdida de rendimiento asegurada. Suspender plan base y realizar análisis urgente de suelo y agua para reestructurar el programa."
    };
  if (score === 1)
    return {
      semaphore: "amarillo" as const,
      status: "Alerta de Bloqueo Nutricional",
      message:
        "Deficiencias moderadas detectadas. Programar aplicación correctiva de choque con quelatos. Si se sospecha de Hierro, revisar si un pH muy alto en el suelo está bloqueando el elemento."
    };
  return {
    semaphore: "verde" as const,
    status: "Fundo Nutrito / Salud Fuerte",
    message:
      "Estado nutricional óptimo o bajo control preventivo. Continuar con el calendario de fertirriego regular."
  };
}

const LABOR_WEIGHTS: Record<string, number> = {
  weed_infestation: 10,
  soil_sanitary_status: 20,
  unproductive_branch_density: 10,
  branch_break_risk: 25,
  canopy_status: 15,
  load_balance: 20
};
const LABOR_POINTS: Record<string, Record<string, number>> = {
  weed_infestation: { clean: 3, low: 2, high: 1 },
  soil_sanitary_status: { clean: 3, mild: 2, critical: 0 },
  unproductive_branch_density: { low: 3, moderate: 2, high: 1 },
  branch_break_risk: { low: 3, critical: 0 },
  canopy_status: { good: 3, shaded: 1 },
  load_balance: { balanced: 3, low_volume: 1, excessive: 1 }
};

function calculateLaborDetail(
  input: LocalTechnicalScoreInput
): LaborModuleTechnicalDetail | null {
  if (!input.isActive || (!input.hasRecipe && !input.finalizedSteps.includes(6))) {
    return null;
  }
  const selected = new Map(
    input.labores.filter((l) => l.categoryCode).map((l) => [l.categoryCode!, l])
  );
  if (Object.keys(LABOR_WEIGHTS).some((category) => !selected.has(category))) return null;

  const laborScores = Object.entries(LABOR_WEIGHTS).map(([category, weight]) => {
    const labor = selected.get(category);
    const optionCode = labor?.optionCode ?? "";
    const score = LABOR_POINTS[category]?.[optionCode] ?? 0;
    return {
      categoryCode: category,
      categoryName: labor?.categoryName ?? "",
      optionCode,
      optionName: labor?.optionName ?? "",
      score,
      weight
    };
  });
  const moduleScore =
    Object.entries(LABOR_WEIGHTS).reduce((total, [category, weight]) => {
      const option = selected.get(category)?.optionCode ?? "";
      return total + (LABOR_POINTS[category][option] ?? 0) * weight;
    }, 0) / 100;
  const rounded = Math.round((moduleScore + Number.EPSILON) * 100) / 100;
  const semaphore = resolveLaborSemaphore(rounded);
  return {
    moduleScore: rounded,
    modulePercentage: percentage(rounded),
    semaphore,
    ...resolveLaborStatusAndMessage(rounded),
    laborScores
  };
}

function resolveLaborSemaphore(score: number) {
  if (score <= 1) return "rojo" as const;
  if (score === 2) return "amarillo" as const;
  return "verde" as const;
}

function resolveLaborStatusAndMessage(score: number) {
  if (score <= 1) {
    return {
      status: "Lote en estado critico de manejo cultural",
      message:
        "El lote requiere intervencion inmediata. Hay riesgos estructurales o fitosanitarios que ponen en peligro la cosecha."
    };
  }
  if (score === 2) {
    return {
      status: "Lote en estado intermedio de manejo",
      message:
        "El lote esta bajo control, pero acumula labores retrasadas que afectaran el potencial optimo si no se programan esta semana."
    };
  }
  return {
    status: "Lote en excelente condicion agronomica",
    message:
      "El lote se encuentra en optimas condiciones de manejo cultural. Continuar con el plan de trabajo estandar."
  };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function percentage(score: number) {
  return Math.round(((score / 3) * 100 + Number.EPSILON) * 100) / 100;
}
