import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const SUBSECTORES_MIGRATION: DatabaseMigration = {
  id: "025-subsectores",
  description:
    "Adds subsectores and moves parcelas from sector_id to subsector_id.",
  sql: `
    CREATE TABLE IF NOT EXISTS subsectores (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      sector_id bigint NOT NULL,
      public_id uuid NOT NULL DEFAULT gen_random_uuid(),
      nombre varchar(120) NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subsectores_sector_id_fkey'
      ) THEN
        ALTER TABLE subsectores
          ADD CONSTRAINT subsectores_sector_id_fkey
          FOREIGN KEY (sector_id) REFERENCES sectores(id) ON DELETE RESTRICT;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_subsectores_sector_nombre'
      ) THEN
        ALTER TABLE subsectores
          ADD CONSTRAINT uq_subsectores_sector_nombre UNIQUE (sector_id, nombre);
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_subsectores_sector_id
      ON subsectores(sector_id);

    DO $$
    DECLARE
      table_name text;
    BEGIN
      FOREACH table_name IN ARRAY ARRAY[
        'visita_receta_fitosanidad',
        'visita_receta_fertilizacion',
        'visita_receta_riego',
        'visita_receta_labores',
        'visita_recetas',
        'visita_labores_culturales',
        'visita_riegos',
        'visita_paso_observaciones',
        'visita_observacion_sanitaria_organos',
        'visita_observaciones_sanitarias',
        'visita_evaluaciones',
        'visitas_campo'
      ]
      LOOP
        IF to_regclass('public.' || table_name) IS NOT NULL THEN
          EXECUTE format('DELETE FROM %I', table_name);
        END IF;
      END LOOP;
    END $$;

    DELETE FROM parcelas;

    ALTER TABLE parcelas
      ADD COLUMN IF NOT EXISTS subsector_id bigint;

    ALTER TABLE parcelas
      DROP CONSTRAINT IF EXISTS parcelas_sector_id_fkey;
    ALTER TABLE parcelas
      DROP CONSTRAINT IF EXISTS fk_parcelas_sector_id;
    ALTER TABLE parcelas
      DROP CONSTRAINT IF EXISTS parcelas_productor_id_sector_id_codigo_key;
    ALTER TABLE parcelas
      DROP CONSTRAINT IF EXISTS uq_parcelas_productor_sector_codigo;

    DROP INDEX IF EXISTS idx_parcelas_productor_sector;
    DROP INDEX IF EXISTS uq_parcelas_productor_sector_codigo;

    ALTER TABLE parcelas
      DROP COLUMN IF EXISTS sector_id;

    ALTER TABLE parcelas
      ALTER COLUMN subsector_id SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'parcelas_subsector_id_fkey'
      ) THEN
        ALTER TABLE parcelas
          ADD CONSTRAINT parcelas_subsector_id_fkey
          FOREIGN KEY (subsector_id) REFERENCES subsectores(id) ON DELETE RESTRICT;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'parcelas_productor_id_subsector_id_codigo_key'
      ) THEN
        ALTER TABLE parcelas
          ADD CONSTRAINT parcelas_productor_id_subsector_id_codigo_key
          UNIQUE (productor_id, subsector_id, codigo);
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_parcelas_subsector_id
      ON parcelas(subsector_id);
    CREATE INDEX IF NOT EXISTS idx_parcelas_productor_subsector
      ON parcelas(productor_id, subsector_id);

    -- Rollback operativo:
    -- 1. Restaurar backup previo si se necesita recuperar parcelas o visitas.
    -- 2. Revertir API/admin/mobile al contrato con sector_id.
    -- 3. Descartar datos creados tras esta migracion.
    -- 4. Ejecutar una migracion forward que agregue sector_id, elimine
    --    subsector_id y dropee subsectores solo despues de recrear constraints.
    -- 5. Mantener parcelas_codigo_seq; el codigo PAR-### sigue siendo global.
  `
};
