import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CULTIVO_CODE_REQUIRED_MIGRATION: DatabaseMigration = {
  id: "022-cultivo-code-required",
  description: "Requires non-empty crop codes so API catalogs remain compatible with mobile SQLite.",
  sql: `
    UPDATE cultivos
    SET codigo = btrim(codigo)
    WHERE codigo IS NOT NULL;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM cultivos
        WHERE codigo IS NULL OR btrim(codigo) = ''
      ) THEN
        RAISE EXCEPTION 'Cannot require cultivos.codigo: existing rows have null or empty codes.';
      END IF;
    END
    $$;

    ALTER TABLE cultivos
      ALTER COLUMN codigo SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cultivos_codigo_not_blank_check'
      ) THEN
        ALTER TABLE cultivos
          ADD CONSTRAINT cultivos_codigo_not_blank_check
          CHECK (btrim(codigo) <> '');
      END IF;
    END
    $$;
  `
};
