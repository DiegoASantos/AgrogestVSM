import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PLAGAS_ENFERMEDADES_ETAPA_FENOLOGICA_MIGRATION: DatabaseMigration = {
  id: "008-plagas-enfermedades-etapa-fenologica",
  description: "Links pests and diseases to phenological stages.",
  sql: `
    ALTER TABLE plagas_enfermedades
      ADD COLUMN IF NOT EXISTS etapa_fenologica_id bigint;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'plagas_enfermedades_etapa_fenologica_id_fkey'
      ) THEN
        ALTER TABLE plagas_enfermedades
          ADD CONSTRAINT plagas_enfermedades_etapa_fenologica_id_fkey
          FOREIGN KEY (etapa_fenologica_id)
          REFERENCES etapas_fenologicas(id)
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_plagas_enfermedades_etapa_fenologica_id
      ON plagas_enfermedades(etapa_fenologica_id);
  `
};
