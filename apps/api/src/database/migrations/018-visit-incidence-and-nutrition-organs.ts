import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISIT_INCIDENCE_AND_NUTRITION_ORGANS_MIGRATION: DatabaseMigration = {
  id: "018-visit-incidence-and-nutrition-organs",
  description:
    "Adds percentage incidence fields and affected organs for nutrition evaluations.",
  sql: `
    ALTER TABLE visita_observaciones_sanitarias
      ADD COLUMN IF NOT EXISTS incidencia_porcentaje numeric(5,2);

    ALTER TABLE visita_evaluaciones
      ADD COLUMN IF NOT EXISTS incidencia_porcentaje numeric(5,2),
      ADD COLUMN IF NOT EXISTS organos_afectados text[] NOT NULL DEFAULT '{}';

    ALTER TABLE visita_observaciones_sanitarias
      DROP CONSTRAINT IF EXISTS visita_observaciones_sanitarias_incidencia_porcentaje_check;

    ALTER TABLE visita_observaciones_sanitarias
      ADD CONSTRAINT visita_observaciones_sanitarias_incidencia_porcentaje_check
      CHECK (
        incidencia_porcentaje IS NULL
        OR (
          incidencia_porcentaje >= 0
          AND incidencia_porcentaje <= 100
          AND incidencia_porcentaje = floor(incidencia_porcentaje)
        )
      );

    ALTER TABLE visita_evaluaciones
      DROP CONSTRAINT IF EXISTS visita_evaluaciones_incidencia_porcentaje_check;

    ALTER TABLE visita_evaluaciones
      ADD CONSTRAINT visita_evaluaciones_incidencia_porcentaje_check
      CHECK (
        incidencia_porcentaje IS NULL
        OR (
          incidencia_porcentaje >= 0
          AND incidencia_porcentaje <= 100
          AND incidencia_porcentaje = floor(incidencia_porcentaje)
        )
      );

    ALTER TABLE visita_evaluaciones
      DROP CONSTRAINT IF EXISTS visita_evaluaciones_organos_afectados_check;

    ALTER TABLE visita_evaluaciones
      ADD CONSTRAINT visita_evaluaciones_organos_afectados_check
      CHECK (
        organos_afectados <@ ARRAY[
          'tronco_rama',
          'yema_apical',
          'brote_vegetativo',
          'hoja_tierna',
          'hoja_madura',
          'panicula_floral',
          'flor_individual',
          'fruto_recien_cuajado',
          'fruto_verde',
          'fruto_maduro',
          'raices'
        ]::text[]
      );
  `
};
