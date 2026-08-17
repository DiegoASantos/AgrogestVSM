import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const RECOMENDACIONES_REACTIVAS_PREVENTIVAS_MIGRATION: DatabaseMigration = {
  id: "049-recomendaciones-reactivas-preventivas",
  description:
    "Identifica recomendaciones reactivas y preventivas sin alterar la evidencia de campo.",
  sql: `
    ALTER TABLE visita_receta_fitosanidad
      ADD COLUMN IF NOT EXISTS enfoque varchar(12) NOT NULL DEFAULT 'reactivo',
      ADD COLUMN IF NOT EXISTS objetivo_id bigint,
      ADD COLUMN IF NOT EXISTS incidencia_grado smallint,
      ADD COLUMN IF NOT EXISTS severidad_grado smallint;

    ALTER TABLE visita_receta_fitosanidad
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_enfoque,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_incidencia_grado,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_severidad_grado,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_preventiva,
      DROP CONSTRAINT IF EXISTS fk_visita_receta_fitosanidad_objetivo;

    ALTER TABLE visita_receta_fitosanidad
      ADD CONSTRAINT ck_visita_receta_fitosanidad_enfoque
        CHECK (enfoque IN ('reactivo', 'preventivo')),
      ADD CONSTRAINT ck_visita_receta_fitosanidad_incidencia_grado
        CHECK (incidencia_grado IS NULL OR incidencia_grado BETWEEN 0 AND 3),
      ADD CONSTRAINT ck_visita_receta_fitosanidad_severidad_grado
        CHECK (severidad_grado IS NULL OR severidad_grado BETWEEN 0 AND 3),
      ADD CONSTRAINT ck_visita_receta_fitosanidad_preventiva
        CHECK (
          enfoque = 'reactivo' OR (
            objetivo_id IS NOT NULL AND
            incidencia_grado = 0 AND
            severidad_grado = 0
          )
        ),
      ADD CONSTRAINT fk_visita_receta_fitosanidad_objetivo
        FOREIGN KEY (objetivo_id) REFERENCES plagas_enfermedades(id)
        ON UPDATE NO ACTION ON DELETE RESTRICT;

    ALTER TABLE visita_receta_fertilizacion
      ADD COLUMN IF NOT EXISTS enfoque varchar(12) NOT NULL DEFAULT 'reactivo';

    ALTER TABLE visita_receta_fertilizacion
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fertilizacion_enfoque,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fertilizacion_preventiva;

    ALTER TABLE visita_receta_fertilizacion
      ADD CONSTRAINT ck_visita_receta_fertilizacion_enfoque
        CHECK (enfoque IN ('reactivo', 'preventivo')),
      ADD CONSTRAINT ck_visita_receta_fertilizacion_preventiva
        CHECK (enfoque = 'reactivo' OR factor = 1);

    COMMENT ON COLUMN visita_receta_fitosanidad.enfoque IS
      'Origen de la recomendacion; una prevencion no crea evidencia de campo.';
    COMMENT ON COLUMN visita_receta_fertilizacion.enfoque IS
      'Identifica si el producto fue recomendado de forma reactiva o preventiva.';

    -- Rollback operativo: desplegar el codigo anterior, que ignora estas
    -- columnas aditivas. No eliminar columnas durante la ventana de clientes
    -- mobile instalados; una contraccion posterior requiere verificacion previa.
  `
};
