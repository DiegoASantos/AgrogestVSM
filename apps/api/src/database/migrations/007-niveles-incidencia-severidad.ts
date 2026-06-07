import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const NIVELES_INCIDENCIA_SEVERIDAD_MIGRATION: DatabaseMigration = {
  id: "007-niveles-incidencia-severidad",
  description:
    "Renames incidence levels table and classifies levels by incidence or severity.",
  sql: `
    DO $$
    BEGIN
      IF to_regclass('public.niveles_incidencia_severidad') IS NULL
        AND to_regclass('public.niveles_incidencia') IS NOT NULL THEN
        ALTER TABLE niveles_incidencia
          RENAME TO niveles_incidencia_severidad;
      END IF;
    END
    $$;

    ALTER TABLE niveles_incidencia_severidad
      ADD COLUMN IF NOT EXISTS tipo varchar(20);

    UPDATE niveles_incidencia_severidad
    SET tipo = 'incidencia'
    WHERE tipo IS NULL;

    ALTER TABLE niveles_incidencia_severidad
      ALTER COLUMN tipo SET DEFAULT 'incidencia';

    ALTER TABLE niveles_incidencia_severidad
      ALTER COLUMN tipo SET NOT NULL;

    ALTER TABLE niveles_incidencia_severidad
      DROP CONSTRAINT IF EXISTS niveles_incidencia_nombre_key;

    ALTER TABLE niveles_incidencia_severidad
      DROP CONSTRAINT IF EXISTS niveles_incidencia_valor_orden_key;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'niveles_incidencia_severidad_tipo_check'
      ) THEN
        ALTER TABLE niveles_incidencia_severidad
          ADD CONSTRAINT niveles_incidencia_severidad_tipo_check
          CHECK (tipo IN ('incidencia', 'severidad'));
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'niveles_incidencia_severidad_tipo_nombre_key'
      ) THEN
        ALTER TABLE niveles_incidencia_severidad
          ADD CONSTRAINT niveles_incidencia_severidad_tipo_nombre_key
          UNIQUE (tipo, nombre);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'niveles_incidencia_severidad_tipo_valor_orden_key'
      ) THEN
        ALTER TABLE niveles_incidencia_severidad
          ADD CONSTRAINT niveles_incidencia_severidad_tipo_valor_orden_key
          UNIQUE (tipo, valor_orden);
      END IF;
    END
    $$;
  `
};
