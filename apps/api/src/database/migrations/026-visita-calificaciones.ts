import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_CALIFICACIONES_MIGRATION: DatabaseMigration = {
  id: "026-visita-calificaciones",
  description: "Adds technical compliance scores for field visits.",
  sql: `
    CREATE TABLE IF NOT EXISTS visita_calificaciones (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      public_id uuid NOT NULL DEFAULT gen_random_uuid(),
      visita_id bigint NOT NULL,
      modulo varchar(50) NOT NULL,
      puntaje smallint NOT NULL,
      observacion text,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'visita_calificaciones_public_id_key'
      ) THEN
        ALTER TABLE visita_calificaciones
          ADD CONSTRAINT visita_calificaciones_public_id_key UNIQUE (public_id);
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'visita_calificaciones_visita_id_fkey'
      ) THEN
        ALTER TABLE visita_calificaciones
          ADD CONSTRAINT visita_calificaciones_visita_id_fkey
          FOREIGN KEY (visita_id) REFERENCES visitas_campo(id) ON DELETE CASCADE;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_visita_calificaciones_visita_modulo'
      ) THEN
        ALTER TABLE visita_calificaciones
          ADD CONSTRAINT uq_visita_calificaciones_visita_modulo UNIQUE (visita_id, modulo);
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_visita_calificaciones_modulo'
      ) THEN
        ALTER TABLE visita_calificaciones
          ADD CONSTRAINT chk_visita_calificaciones_modulo CHECK (
            modulo IN ('plagas', 'enfermedades', 'nutricion', 'riego', 'labores')
          );
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_visita_calificaciones_puntaje'
      ) THEN
        ALTER TABLE visita_calificaciones
          ADD CONSTRAINT chk_visita_calificaciones_puntaje CHECK (
            puntaje >= 0 AND puntaje <= 3
          );
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_visita_calificaciones_visita_id
      ON visita_calificaciones(visita_id);

    -- Rollback operativo:
    -- 1. Detener clientes que escriben visita_calificaciones.
    -- 2. Respaldar la tabla si se requiere conservar calificaciones.
    -- 3. Ejecutar DROP TABLE IF EXISTS visita_calificaciones CASCADE.
    -- 4. Revertir API/mobile/admin al contrato anterior sin scoring.
  `
};
