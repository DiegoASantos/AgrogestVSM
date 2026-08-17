import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const UNIDADES_DOSIS_RECETA_MIGRATION: DatabaseMigration = {
  id: "048-unidades-dosis-receta",
  description:
    "Agrega la unidad seleccionada por el usuario a la dosis fitosanitaria sin cambiar las formulas.",
  sql: `
    ALTER TABLE visita_receta_fitosanidad
      ADD COLUMN IF NOT EXISTS unidad_dosis varchar(30);

    ALTER TABLE visita_receta_fitosanidad
      DROP CONSTRAINT IF EXISTS ck_visita_receta_fitosanidad_unidad_dosis;

    ALTER TABLE visita_receta_fitosanidad
      ADD CONSTRAINT ck_visita_receta_fitosanidad_unidad_dosis
      CHECK (
        unidad_dosis IS NULL OR
        unidad_dosis IN (
          'mg/cilindro',
          'g/cilindro',
          'kg/cilindro',
          'ml/cilindro',
          'l/cilindro'
        )
      );

    COMMENT ON COLUMN visita_receta_fitosanidad.unidad_dosis IS
      'Unidad elegida para dosis_producto. No aplica conversion automatica.';

    -- Rollback operativo: desplegar primero el codigo anterior. La columna es
    -- nullable y puede conservarse sin afectar clientes legacy. Una contraccion
    -- posterior puede retirar el constraint y la columna tras verificar que no
    -- existan clientes que dependan de unidadDosis.
  `
};
