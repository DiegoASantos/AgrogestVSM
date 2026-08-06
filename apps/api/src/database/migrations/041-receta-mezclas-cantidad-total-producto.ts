import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const RECETA_MEZCLAS_CANTIDAD_TOTAL_PRODUCTO_MIGRATION: DatabaseMigration = {
  id: "041-receta-mezclas-cantidad-total-producto",
  description:
    "Adds cantidad_total_producto to visita_receta_mezclas. The column was added to the 040 DDL after initial deploy; this migration ensures production parity.",
  sql: `
    ALTER TABLE visita_receta_mezclas
      ADD COLUMN IF NOT EXISTS cantidad_total_producto numeric(14, 4);

    -- Rollback: no-op. The column is nullable and safe to keep even if the
    -- application code that reads it is rolled back. No DROP is automated in production.
  `
};
