import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ETAPAS_FENOLOGICAS_ORDER_AND_TYPE_MIGRATION: DatabaseMigration = {
  id: "002-etapas-fenologicas-order-and-type",
  description: "Adds order and type metadata to phenological stages.",
  sql: `
    ALTER TABLE etapas_fenologicas
      ADD COLUMN IF NOT EXISTS orden integer;

    ALTER TABLE etapas_fenologicas
      ADD COLUMN IF NOT EXISTS tipo varchar(100) NOT NULL DEFAULT 'Etapa';

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'etapas_fenologicas_tipo_check'
      ) THEN
        ALTER TABLE etapas_fenologicas
          ADD CONSTRAINT etapas_fenologicas_tipo_check
          CHECK (tipo IN ('Etapa', 'Labor'));
      END IF;
    END
    $$;
  `
};
