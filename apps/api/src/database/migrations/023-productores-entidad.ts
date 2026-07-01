import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PRODUCTORES_ENTIDAD_MIGRATION: DatabaseMigration = {
  id: "023-productores-entidad",
  description:
    "Adds producer entity type and relaxes document columns for fundos and cooperativas.",
  sql: `
    ALTER TABLE productores
      ADD COLUMN IF NOT EXISTS entidad varchar(20) NOT NULL DEFAULT 'persona';

    ALTER TABLE productores
      ALTER COLUMN tipo_documento_id DROP NOT NULL;

    ALTER TABLE productores
      ALTER COLUMN nro_documento DROP NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_productores_entidad'
      ) THEN
        ALTER TABLE productores
          ADD CONSTRAINT chk_productores_entidad
          CHECK (entidad IN ('persona', 'fundo', 'cooperativa'));
      END IF;
    END
    $$;

    -- Rollback operativo:
    -- 1. Convertir o eliminar productores con entidad distinta de 'persona'.
    -- 2. Completar tipo_documento_id y nro_documento en todos los productores.
    -- 3. Ejecutar manualmente:
    --    ALTER TABLE productores DROP CONSTRAINT IF EXISTS chk_productores_entidad;
    --    ALTER TABLE productores DROP COLUMN IF EXISTS entidad;
    --    ALTER TABLE productores ALTER COLUMN tipo_documento_id SET NOT NULL;
    --    ALTER TABLE productores ALTER COLUMN nro_documento SET NOT NULL;
  `
};
