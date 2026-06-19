import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const RELAX_RECETA_FITOSANIDAD_CATALOG_FKS_MIGRATION: DatabaseMigration = {
  id: "020-relax-receta-fitosanidad-catalog-fks",
  description:
    "Drops optional catalog foreign keys from visita_receta_fitosanidad so stale mobile catalogs do not block recipe sync.",
  sql: `
    ALTER TABLE visita_receta_fitosanidad
      DROP CONSTRAINT IF EXISTS visita_receta_fitosanidad_tipo_control_id_fkey;

    ALTER TABLE visita_receta_fitosanidad
      DROP CONSTRAINT IF EXISTS visita_receta_fitosanidad_tipo_producto_id_fkey;

    ALTER TABLE visita_receta_fitosanidad
      DROP CONSTRAINT IF EXISTS visita_receta_fitosanidad_modo_accion_id_fkey;
  `
};
