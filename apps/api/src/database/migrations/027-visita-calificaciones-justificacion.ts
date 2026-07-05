import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_CALIFICACIONES_JUSTIFICACION_MIGRATION: DatabaseMigration = {
  id: "027-visita-calificaciones-justificacion",
  description:
    "Adds low-score justification fields and allows step notes up to step 6.",
  sql: `
    ALTER TABLE visita_calificaciones
      ADD COLUMN IF NOT EXISTS justificado boolean;

    ALTER TABLE visita_calificaciones
      ADD COLUMN IF NOT EXISTS categoria_justificacion varchar(100);

    ALTER TABLE visita_calificaciones
      ADD COLUMN IF NOT EXISTS motivo_justificacion varchar(200);

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visita_paso_observaciones_paso_check'
      ) THEN
        ALTER TABLE visita_paso_observaciones
          DROP CONSTRAINT visita_paso_observaciones_paso_check;
      END IF;

      ALTER TABLE visita_paso_observaciones
        ADD CONSTRAINT visita_paso_observaciones_paso_check
        CHECK (paso BETWEEN 1 AND 6);
    END
    $$;

    -- Rollback operativo:
    -- 1. Detener clientes que escriben justificaciones y notas del paso 6.
    -- 2. Respaldar visita_calificaciones y visita_paso_observaciones si se requiere.
    -- 3. Ejecutar:
    --    ALTER TABLE visita_paso_observaciones DROP CONSTRAINT IF EXISTS visita_paso_observaciones_paso_check;
    --    ALTER TABLE visita_paso_observaciones ADD CONSTRAINT visita_paso_observaciones_paso_check CHECK (paso BETWEEN 1 AND 5);
    --    ALTER TABLE visita_calificaciones DROP COLUMN IF EXISTS motivo_justificacion;
    --    ALTER TABLE visita_calificaciones DROP COLUMN IF EXISTS categoria_justificacion;
    --    ALTER TABLE visita_calificaciones DROP COLUMN IF EXISTS justificado;
  `
};
