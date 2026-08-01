import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const SCORE_TECNICO_NUTRICION_MIGRATION: DatabaseMigration = {
  id: "036-score-tecnico-nutricion",
  description:
    "Adds stable nutrient codes and links nutritional evaluations to their catalog item.",
  sql: `
    ALTER TABLE nutrientes
      ADD COLUMN IF NOT EXISTS codigo varchar(40);

    UPDATE nutrientes
    SET codigo = CASE lower(trim(nombre))
      WHEN 'nitrogeno' THEN 'nitrogeno'
      WHEN 'nitrógeno' THEN 'nitrogeno'
      WHEN 'magnesio' THEN 'magnesio'
      WHEN 'potasio' THEN 'potasio'
      WHEN 'hierro' THEN 'hierro'
      WHEN 'zinc' THEN 'zinc'
      WHEN 'boro' THEN 'boro'
      ELSE codigo
    END
    WHERE codigo IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_nutrientes_cultivo_codigo
      ON nutrientes(cultivo_id, codigo)
      WHERE codigo IS NOT NULL;

    ALTER TABLE visita_evaluaciones
      ADD COLUMN IF NOT EXISTS nutriente_id bigint;

    UPDATE visita_evaluaciones evaluacion
    SET nutriente_id = nutriente.id
    FROM visitas_campo visita
    INNER JOIN nutrientes nutriente
      ON nutriente.cultivo_id = visita.cultivo_id
    WHERE evaluacion.visita_id = visita.id
      AND evaluacion.nutriente_id IS NULL
      AND evaluacion.descripcion LIKE 'Nutricion - %'
      AND lower(trim(nutriente.nombre)) = lower(trim(
        split_part(split_part(evaluacion.descripcion, 'Nutricion - ', 2), ':', 1)
      ));

    UPDATE visita_evaluaciones
    SET incidencia_porcentaje = 0
    WHERE nutriente_id IS NOT NULL
      AND incidencia_porcentaje IS NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'visita_evaluaciones_nutriente_id_fkey'
      ) THEN
        ALTER TABLE visita_evaluaciones
          ADD CONSTRAINT visita_evaluaciones_nutriente_id_fkey
          FOREIGN KEY (nutriente_id)
          REFERENCES nutrientes(id)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
      END IF;
    END $$;

    ALTER TABLE visita_evaluaciones
      DROP CONSTRAINT IF EXISTS visita_evaluaciones_nutricion_porcentaje_requerido_check;

    ALTER TABLE visita_evaluaciones
      ADD CONSTRAINT visita_evaluaciones_nutricion_porcentaje_requerido_check
      CHECK (nutriente_id IS NULL OR incidencia_porcentaje IS NOT NULL);

    CREATE UNIQUE INDEX IF NOT EXISTS uq_visita_evaluaciones_visita_nutriente
      ON visita_evaluaciones(visita_id, nutriente_id)
      WHERE nutriente_id IS NOT NULL;

    -- Rollback operativo: conservar codigo y nutriente_id porque son columnas
    -- aditivas consumidas por clientes nuevos. Revertir API/UI sin borrar datos;
    -- una contraccion futura solo procede tras retirar todos esos clientes.
  `
};
