import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const AGREGAR_AGRONOMO_PARCELAS_MIGRATION: DatabaseMigration = {
  id: "030-agregar-agronomo-parcelas",
  description:
    "Agrega columna agronomo_usuario_id en parcelas para asignar un agronomo a cada parcela.",
  sql: `
    ALTER TABLE parcelas
      ADD COLUMN IF NOT EXISTS agronomo_usuario_id bigint
      REFERENCES usuarios(id);

    CREATE INDEX IF NOT EXISTS idx_parcelas_agronomo
      ON parcelas(agronomo_usuario_id);

    -- Rollback:
    -- DROP INDEX IF EXISTS idx_parcelas_agronomo;
    -- ALTER TABLE parcelas DROP COLUMN IF EXISTS agronomo_usuario_id;
  `
};
