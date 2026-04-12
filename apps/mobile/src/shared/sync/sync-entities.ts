export const SYNC_ENTITY_TABLES = {
  visitas_campo: "visitas_campo",
  visita_evaluaciones: "visita_evaluaciones",
  visita_observaciones_sanitarias: "visita_observaciones_sanitarias",
  visita_recomendaciones: "visita_recomendaciones",
  visita_productos_recomendados: "visita_productos_recomendados"
} as const;

export type SyncEntityType = keyof typeof SYNC_ENTITY_TABLES;

export const SYNC_ENTITY_TYPES = Object.keys(
  SYNC_ENTITY_TABLES
) as SyncEntityType[];
