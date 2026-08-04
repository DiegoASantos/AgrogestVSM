import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const RECETA_MEZCLAS_FACTOR_DOSIFICACION_MIGRATION: DatabaseMigration = {
  id: "040-receta-mezclas-factor-dosificacion",
  description:
    "Adds recipe mixtures, product dosage and incidence factors while preserving legacy columns for rollback compatibility.",
  sql: `
    CREATE TABLE IF NOT EXISTS visita_receta_mezclas (
      id bigserial PRIMARY KEY,
      receta_id bigint NOT NULL,
      numero integer NOT NULL CHECK (numero > 0),
      coadyuvantes_ids text,
      orden_mezcla text,
      volumen_aplicacion numeric(12, 4),
      factor numeric(6, 3) NOT NULL DEFAULT 1 CHECK (factor >= 1 AND factor <= 10),
      factor_editable boolean NOT NULL DEFAULT false,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_receta_mezclas_receta_id_fkey
        FOREIGN KEY (receta_id) REFERENCES visita_recetas(id) ON DELETE CASCADE
    );

    ALTER TABLE visita_receta_fitosanidad
      ADD COLUMN IF NOT EXISTS mezcla_id bigint,
      ADD COLUMN IF NOT EXISTS dosis_producto numeric(12, 4);

    ALTER TABLE visita_receta_fertilizacion
      ADD COLUMN IF NOT EXISTS factor numeric(6, 3) NOT NULL DEFAULT 1;

    UPDATE visita_receta_fitosanidad
    SET dosis_producto = dosis_ia
    WHERE dosis_producto IS NULL AND dosis_ia IS NOT NULL;

    DO $migration$
    DECLARE
      grupo record;
      nueva_mezcla_id bigint;
    BEGIN
      FOR grupo IN
        SELECT DISTINCT ON (receta_id, numero, objetivo, objetivo_nombre)
          receta_id,
          numero,
          objetivo,
          objetivo_nombre,
          coadyuvantes_ids,
          orden_mezcla,
          volumen_aplicacion
        FROM visita_receta_fitosanidad
        WHERE mezcla_id IS NULL
        ORDER BY receta_id, numero, objetivo, objetivo_nombre, id
      LOOP
        INSERT INTO visita_receta_mezclas (
          receta_id,
          numero,
          coadyuvantes_ids,
          orden_mezcla,
          volumen_aplicacion,
          factor,
          factor_editable
        ) VALUES (
          grupo.receta_id,
          grupo.numero,
          grupo.coadyuvantes_ids,
          grupo.orden_mezcla,
          grupo.volumen_aplicacion,
          1,
          false
        ) RETURNING id INTO nueva_mezcla_id;

        UPDATE visita_receta_fitosanidad
        SET mezcla_id = nueva_mezcla_id
        WHERE receta_id = grupo.receta_id
          AND numero = grupo.numero
          AND objetivo = grupo.objetivo
          AND objetivo_nombre = grupo.objetivo_nombre
          AND mezcla_id IS NULL;
      END LOOP;
    END
    $migration$;

    DO $migration$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visita_receta_fitosanidad_mezcla_id_fkey'
      ) THEN
        ALTER TABLE visita_receta_fitosanidad
          ADD CONSTRAINT visita_receta_fitosanidad_mezcla_id_fkey
          FOREIGN KEY (mezcla_id) REFERENCES visita_receta_mezclas(id) ON DELETE CASCADE;
      END IF;
    END
    $migration$;

    CREATE INDEX IF NOT EXISTS idx_visita_receta_mezclas_receta_id
      ON visita_receta_mezclas(receta_id);
    CREATE INDEX IF NOT EXISTS idx_visita_receta_fitosanidad_mezcla_id
      ON visita_receta_fitosanidad(mezcla_id);

    COMMENT ON COLUMN visita_receta_fitosanidad.dosis_ia IS
      'Deprecated by Spec 029; retained for compatibility and rollback.';
    COMMENT ON COLUMN visita_receta_fitosanidad.volumen_aplicacion IS
      'Deprecated by Spec 029; use visita_receta_mezclas.volumen_aplicacion.';
    COMMENT ON COLUMN visita_receta_fitosanidad.cantidad_total_ia IS
      'Deprecated by Spec 029; retained for compatibility and rollback.';
    COMMENT ON COLUMN visita_receta_fitosanidad.coadyuvantes_ids IS
      'Deprecated by Spec 029; use visita_receta_mezclas.coadyuvantes_ids.';
    COMMENT ON COLUMN visita_receta_fitosanidad.orden_mezcla IS
      'Deprecated by Spec 029; use visita_receta_mezclas.orden_mezcla.';

    -- Rollback operativo: desplegar primero el codigo anterior, que sigue leyendo
    -- las columnas legacy pobladas por la API compatible. Luego retirar la FK y las
    -- columnas nuevas y finalmente visita_receta_mezclas. No automatizar DROP en
    -- produccion: las mezclas creadas tras esta migracion requieren backup previo.
  `
};
