import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PLAGAS_ENFERMEDADES_ETAPAS_NIVELES_MIGRATION: DatabaseMigration = {
  id: "009-plagas-enfermedades-etapas-niveles",
  description:
    "Creates the pest disease phenological stage and incidence/severity level relation.",
  sql: `
    CREATE TABLE IF NOT EXISTS plagas_enfermedades_etapas_niveles (
      id bigserial PRIMARY KEY,
      plaga_enfermedad_id bigint NOT NULL,
      etapa_fenologica_id bigint NOT NULL,
      nivel_incidencia_severidad_id smallint NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'plagas_enfermedades_etapas_niveles_plaga_fkey'
      ) THEN
        ALTER TABLE plagas_enfermedades_etapas_niveles
          ADD CONSTRAINT plagas_enfermedades_etapas_niveles_plaga_fkey
          FOREIGN KEY (plaga_enfermedad_id)
          REFERENCES plagas_enfermedades(id)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'plagas_enfermedades_etapas_niveles_etapa_fkey'
      ) THEN
        ALTER TABLE plagas_enfermedades_etapas_niveles
          ADD CONSTRAINT plagas_enfermedades_etapas_niveles_etapa_fkey
          FOREIGN KEY (etapa_fenologica_id)
          REFERENCES etapas_fenologicas(id)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'plagas_enfermedades_etapas_niveles_nivel_fkey'
      ) THEN
        ALTER TABLE plagas_enfermedades_etapas_niveles
          ADD CONSTRAINT plagas_enfermedades_etapas_niveles_nivel_fkey
          FOREIGN KEY (nivel_incidencia_severidad_id)
          REFERENCES niveles_incidencia_severidad(id)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'plagas_enfermedades_etapas_niveles_unique'
      ) THEN
        ALTER TABLE plagas_enfermedades_etapas_niveles
          ADD CONSTRAINT plagas_enfermedades_etapas_niveles_unique
          UNIQUE (
            plaga_enfermedad_id,
            etapa_fenologica_id,
            nivel_incidencia_severidad_id
          );
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_plagas_enfermedades_etapas_niveles_plaga
      ON plagas_enfermedades_etapas_niveles(plaga_enfermedad_id);

    CREATE INDEX IF NOT EXISTS idx_plagas_enfermedades_etapas_niveles_etapa
      ON plagas_enfermedades_etapas_niveles(etapa_fenologica_id);

    CREATE INDEX IF NOT EXISTS idx_plagas_enfermedades_etapas_niveles_nivel
      ON plagas_enfermedades_etapas_niveles(nivel_incidencia_severidad_id);

    ALTER TABLE plagas_enfermedades
      DROP CONSTRAINT IF EXISTS plagas_enfermedades_etapa_fenologica_id_fkey;

    DROP INDEX IF EXISTS idx_plagas_enfermedades_etapa_fenologica_id;

    ALTER TABLE plagas_enfermedades
      DROP COLUMN IF EXISTS etapa_fenologica_id;
  `
};
