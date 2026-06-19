export type TipoRiegoCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export const FUENTES_AGUA = ["subterranea", "superficial", "pluvial"] as const;
export type FuenteAgua = (typeof FUENTES_AGUA)[number];

export const FUENTE_AGUA_LABELS: Record<FuenteAgua, string> = {
  subterranea: "Subterranea",
  superficial: "Superficial",
  pluvial: "Pluvial"
};

export const TIPOS_SUELO = ["arenoso", "arcilloso", "limoso", "franco"] as const;
export type TipoSuelo = (typeof TIPOS_SUELO)[number];

export const TIPO_SUELO_LABELS: Record<TipoSuelo, string> = {
  arenoso: "Arenoso",
  arcilloso: "Arcilloso",
  limoso: "Limoso",
  franco: "Franco"
};

export const TIPO_SUELO_DESCRIPTIONS: Record<TipoSuelo, string> = {
  arenoso:
    "Estan formados principalmente por particulas grandes de arena. No retienen agua ni nutrientes.",
  arcilloso:
    "Estan dominadas por particulas extremadamente finas de arcilla. El agua se mueve muy lento.",
  limoso:
    "Estan compuestos por limo, que es un sedimento de particulas de tamano intermedio entre arena y arcilla.",
  franco:
    "El suelo franco no es un elemento puro, sino la mezcla perfecta de los 3 anteriores."
};

export const HUMEDADES_SUELO = [
  "saturado",
  "optimo",
  "moderadamente_seco",
  "seco"
] as const;
export type HumedadSuelo = (typeof HUMEDADES_SUELO)[number];

export const HUMEDAD_SUELO_LABELS: Record<HumedadSuelo, string> = {
  saturado: "Saturado",
  optimo: "Optimo",
  moderadamente_seco: "Moderadamente seco",
  seco: "Seco"
};

export const HUMEDAD_SUELO_DESCRIPTIONS: Record<HumedadSuelo, string> = {
  seco:
    "El suelo esta polvoriento o duro y no mancha la piel. Peligro en llenado de fruto, ideal en induccion.",
  moderadamente_seco:
    "El suelo se siente ligeramente humedo pero tiende a agrietarse. Umbral de inicio de riego. Programar turno de riego regular dentro de las proximas 24-48 horas.",
  optimo:
    "El suelo esta humedo, al formar una bola mantiene su cohesion y deja la mano humeda, pero no destila agua. Estado ideal desde el cuajado hasta la maduracion del fruto.",
  saturado:
    "El suelo esta embarrado o pastoso. Al apretarlo gotea o destila agua libremente. Es un peligro absoluto ya que el agua pudre raices y estimula brotes vegetativos."
};

export type VisitaRiego = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  tipoRiegoId: string;
  fuenteAgua: FuenteAgua | null;
  tipoSuelo: TipoSuelo | null;
  humedadSuelo: HumedadSuelo | null;
  estresHidrico: boolean | null;
  createdAt: string;
  updatedAt: string;
};
