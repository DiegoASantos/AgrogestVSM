import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PARCELA_CODIGO_SEQUENCE_MIGRATION: DatabaseMigration = {
  id: "024-parcela-codigo-sequence",
  description: "Adds the sequence used to generate global PAR parcel codes.",
  sql: `
    CREATE SEQUENCE IF NOT EXISTS parcelas_codigo_seq;

    SELECT setval(
      'parcelas_codigo_seq',
      GREATEST(
        (
          SELECT COALESCE(MAX(substring(codigo FROM '^PAR-([0-9]+)$')::bigint), 0)
          FROM parcelas
          WHERE codigo ~ '^PAR-[0-9]+$'
        ) + 1,
        1
      ),
      false
    );

    -- Rollback operativo:
    -- 1. Revertir API/admin al flujo de codigo manual.
    -- 2. Mantener los codigos PAR ya generados; no deben reescribirse.
    -- 3. La secuencia puede conservarse sin afectar lectura ni escritura manual.
    -- 4. Si se decide eliminarla:
    --    DROP SEQUENCE IF EXISTS parcelas_codigo_seq;
  `
};
