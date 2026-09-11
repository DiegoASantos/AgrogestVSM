import type { SyncEntityType } from "./sync-entities";

const VISIT_DIRECT_CHILD_ENTITY_TYPES = new Set<SyncEntityType>([
  "visita_evaluaciones",
  "visita_observaciones_sanitarias",
  "visita_paso_observaciones",
  "visita_riegos",
  "visita_labores_culturales",
  "visita_recetas",
  "visita_calificaciones"
]);

const VISIT_RECIPE_CHILD_ENTITY_TYPES = new Set<SyncEntityType>([
  "visita_receta_fitosanidad",
  "visita_receta_mezcla",
  "visita_receta_fertilizacion",
  "visita_receta_riego",
  "visita_receta_labores"
]);

export function getSyncEntityOwnership(
  entityType: SyncEntityType,
  table: string,
  ownerUserId: string
): { sql: string; parameters: string[] } {
  if (entityType === "productores" || entityType === "parcelas") {
    return {
      sql: `AND ${table}.catalog_owner_user_id = ?`,
      parameters: [ownerUserId]
    };
  }

  if (entityType === "sectores") {
    return {
      sql: `AND EXISTS (
        SELECT 1
        FROM subsectores owner_subsector
        INNER JOIN parcelas owner_parcela
          ON owner_parcela.subsector_id = owner_subsector.id
        WHERE owner_subsector.sector_id = sectores.id
          AND owner_parcela.catalog_owner_user_id = ?
      )`,
      parameters: [ownerUserId]
    };
  }

  if (entityType === "subsectores") {
    return {
      sql: `AND EXISTS (
        SELECT 1
        FROM parcelas owner_parcela
        WHERE owner_parcela.subsector_id = subsectores.id
          AND owner_parcela.catalog_owner_user_id = ?
      )`,
      parameters: [ownerUserId]
    };
  }

  if (entityType === "visitas_campo") {
    return {
      sql: "AND visitas_campo.agronomist_user_id = ?",
      parameters: [ownerUserId]
    };
  }

  if (VISIT_DIRECT_CHILD_ENTITY_TYPES.has(entityType)) {
    return {
      sql: `AND EXISTS (
        SELECT 1
        FROM visitas_campo owner_visita
        WHERE owner_visita.local_id = ${table}.visita_local_id
          AND owner_visita.agronomist_user_id = ?
      )`,
      parameters: [ownerUserId]
    };
  }

  if (VISIT_RECIPE_CHILD_ENTITY_TYPES.has(entityType)) {
    return {
      sql: `AND EXISTS (
        SELECT 1
        FROM visita_recetas owner_receta
        INNER JOIN visitas_campo owner_visita
          ON owner_visita.local_id = owner_receta.visita_local_id
        WHERE owner_receta.local_id = ${table}.receta_local_id
          AND owner_visita.agronomist_user_id = ?
      )`,
      parameters: [ownerUserId]
    };
  }

  // Los catalogos globales no tienen columna de propietario. Sus fallos
  // normales se cuentan desde sync_failures, que si conserva owner_user_id.
  return { sql: "AND 1 = 0", parameters: [] };
}
