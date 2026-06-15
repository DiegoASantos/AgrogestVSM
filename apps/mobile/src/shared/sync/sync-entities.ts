export const SYNC_ENTITY_TABLES = {
  visitas_campo: "visitas_campo",
  visita_evaluaciones: "visita_evaluaciones",
  visita_observaciones_sanitarias: "visita_observaciones_sanitarias",
  visita_paso_observaciones: "visita_paso_observaciones",
  visita_riegos: "visita_riegos",
  visita_labores_culturales: "visita_labores_culturales"
} as const;

export type SyncEntityType = keyof typeof SYNC_ENTITY_TABLES;

export const SYNC_ENTITY_TYPES = Object.keys(SYNC_ENTITY_TABLES) as SyncEntityType[];
