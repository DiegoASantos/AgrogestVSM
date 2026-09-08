import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PRODUCTOS_DIRECTOS_MEZCLAS_MIGRATION: DatabaseMigration = {
  id: "061-productos-directos-mezclas",
  description:
    "Permite productos fitosanitarios y fertilizantes agregados directamente desde mezclas.",
  sql: `
    ALTER TABLE visita_receta_fitosanidad
      ADD COLUMN IF NOT EXISTS origen varchar(20) NOT NULL DEFAULT 'recomendacion';

    ALTER TABLE visita_receta_fertilizacion
      ADD COLUMN IF NOT EXISTS origen varchar(20) NOT NULL DEFAULT 'recomendacion';

    ALTER TABLE visita_receta_fitosanidad
      ALTER COLUMN objetivo DROP NOT NULL,
      ALTER COLUMN objetivo_nombre DROP NOT NULL,
      ALTER COLUMN enfoque DROP NOT NULL;

    ALTER TABLE visita_receta_fitosanidad
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_origen,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_origen_datos,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_enfoque,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_preventiva;

    ALTER TABLE visita_receta_fitosanidad
      ADD CONSTRAINT ck_visita_receta_fitosanidad_origen
        CHECK (origen IN ('recomendacion', 'mezcla_directa')),
      ADD CONSTRAINT ck_visita_receta_fitosanidad_enfoque
        CHECK (enfoque IS NULL OR enfoque IN ('reactivo', 'preventivo')),
      ADD CONSTRAINT ck_visita_receta_fitosanidad_origen_datos
        CHECK (
          (origen = 'mezcla_directa' AND objetivo IS NULL AND objetivo_nombre IS NULL AND enfoque IS NULL)
          OR
          (origen = 'recomendacion' AND objetivo IS NOT NULL AND objetivo_nombre IS NOT NULL AND enfoque IS NOT NULL)
        ),
      ADD CONSTRAINT ck_visita_receta_fitosanidad_preventiva
        CHECK (
          origen = 'mezcla_directa' OR enfoque = 'reactivo' OR (
            objetivo_id IS NOT NULL AND incidencia_grado = 0 AND severidad_grado = 0
          )
        );

    ALTER TABLE visita_receta_fertilizacion
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fertilizacion_origen;

    ALTER TABLE visita_receta_fertilizacion
      ADD CONSTRAINT ck_visita_receta_fertilizacion_origen
        CHECK (origen IN ('recomendacion', 'mezcla_directa'));

    COMMENT ON COLUMN visita_receta_fitosanidad.origen IS
      'Distingue una recomendacion tecnica de un producto agregado directamente en Mezclas.';
    COMMENT ON COLUMN visita_receta_fertilizacion.origen IS
      'Distingue una recomendacion tecnica de un fertilizante agregado directamente en Mezclas.';

    -- Rollback operativo: desplegar codigo anterior y conservar las columnas.
    -- No contraer mientras existan clientes mobile que envien mezcla_directa.
  `
};
