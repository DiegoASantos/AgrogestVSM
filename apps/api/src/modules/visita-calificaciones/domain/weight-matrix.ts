export const CALIFICACION_MODULOS = [
  "plagas",
  "enfermedades",
  "nutricion",
  "riego",
  "labores"
] as const;

export type CalificacionModulo = (typeof CALIFICACION_MODULOS)[number];

export type StageWeights = Record<CalificacionModulo, number>;

export const STAGE_WEIGHTS: Record<string, StageWeights> = {
  poda: { plagas: 15, enfermedades: 20, nutricion: 25, riego: 15, labores: 25 },
  brotamiento: {
    plagas: 25,
    enfermedades: 20,
    nutricion: 15,
    riego: 25,
    labores: 15
  },
  maduracion_del_brote: {
    plagas: 25,
    enfermedades: 20,
    nutricion: 15,
    riego: 25,
    labores: 15
  },
  induccion_floral: {
    plagas: 25,
    enfermedades: 20,
    nutricion: 15,
    riego: 25,
    labores: 15
  },
  floracion: {
    plagas: 25,
    enfermedades: 20,
    nutricion: 15,
    riego: 25,
    labores: 15
  },
  amarre_y_cuajado: {
    plagas: 25,
    enfermedades: 15,
    nutricion: 25,
    riego: 20,
    labores: 15
  },
  desarrollo_de_fruto: {
    plagas: 20,
    enfermedades: 25,
    nutricion: 15,
    riego: 25,
    labores: 15
  },
  cosecha: { plagas: 20, enfermedades: 25, nutricion: 15, riego: 25, labores: 15 }
};

const STAGE_ALIASES: Record<string, string> = {
  maduracion_brote: "maduracion_del_brote",
  amarre_cuajado: "amarre_y_cuajado",
  desarrollo_fruto: "desarrollo_de_fruto"
};

export function normalizeStageName(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return STAGE_ALIASES[normalized] ?? normalized;
}

export function resolveStageWeights(value: string | null | undefined) {
  const normalizedName = normalizeStageName(value);

  return normalizedName ? (STAGE_WEIGHTS[normalizedName] ?? null) : null;
}

export function isCalificacionModulo(value: string): value is CalificacionModulo {
  return CALIFICACION_MODULOS.includes(value as CalificacionModulo);
}
