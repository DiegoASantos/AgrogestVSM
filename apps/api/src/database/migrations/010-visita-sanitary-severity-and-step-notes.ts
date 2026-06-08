import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_SANITARY_SEVERITY_AND_STEP_NOTES_MIGRATION: DatabaseMigration = {
  id: "010-visita-sanitary-severity-and-step-notes",
  description:
    "Adds severity level to sanitary observations and step-level visit notes.",
  sql: `
    ALTER TABLE visita_observaciones_sanitarias
      ADD COLUMN IF NOT EXISTS nivel_severidad_id smallint;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visita_observaciones_sanitarias_nivel_severidad_id_fkey'
      ) THEN
        ALTER TABLE visita_observaciones_sanitarias
          ADD CONSTRAINT visita_observaciones_sanitarias_nivel_severidad_id_fkey
          FOREIGN KEY (nivel_severidad_id)
          REFERENCES niveles_incidencia_severidad(id)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_visita_observaciones_sanitarias_severidad
      ON visita_observaciones_sanitarias(nivel_severidad_id);

    CREATE TABLE IF NOT EXISTS visita_paso_observaciones (
      id bigserial PRIMARY KEY,
      visita_id bigint NOT NULL,
      paso smallint NOT NULL,
      observacion text,
      recomendacion text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_paso_observaciones_paso_check CHECK (paso BETWEEN 1 AND 5)
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visita_paso_observaciones_visita_id_fkey'
      ) THEN
        ALTER TABLE visita_paso_observaciones
          ADD CONSTRAINT visita_paso_observaciones_visita_id_fkey
          FOREIGN KEY (visita_id)
          REFERENCES visitas_campo(id)
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visita_paso_observaciones_visita_paso_key'
      ) THEN
        ALTER TABLE visita_paso_observaciones
          ADD CONSTRAINT visita_paso_observaciones_visita_paso_key
          UNIQUE (visita_id, paso);
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_visita_paso_observaciones_visita
      ON visita_paso_observaciones(visita_id);
  `
};
