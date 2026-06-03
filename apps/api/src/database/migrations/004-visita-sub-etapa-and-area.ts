import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_SUB_ETAPA_AND_AREA_MIGRATION: DatabaseMigration = {
  id: "004-visita-sub-etapa-and-area",
  description: "Adds sub stage progress and visit area to field visits.",
  sql: `
    ALTER TABLE visitas_campo
      ADD COLUMN IF NOT EXISTS sub_etapa_id bigint;

    ALTER TABLE visitas_campo
      ADD COLUMN IF NOT EXISTS sub_etapa_porcentaje numeric(5, 2);

    ALTER TABLE visitas_campo
      ADD COLUMN IF NOT EXISTS area_ha numeric(12, 4);

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visitas_campo_sub_etapa_id_fkey'
      ) THEN
        ALTER TABLE visitas_campo
          ADD CONSTRAINT visitas_campo_sub_etapa_id_fkey
          FOREIGN KEY (sub_etapa_id)
          REFERENCES sub_etapas(id)
          ON DELETE RESTRICT;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visitas_campo_sub_etapa_porcentaje_check'
      ) THEN
        ALTER TABLE visitas_campo
          ADD CONSTRAINT visitas_campo_sub_etapa_porcentaje_check
          CHECK (
            sub_etapa_porcentaje IS NULL OR
            (sub_etapa_porcentaje >= 0 AND sub_etapa_porcentaje <= 100)
          );
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'visitas_campo_area_ha_check'
      ) THEN
        ALTER TABLE visitas_campo
          ADD CONSTRAINT visitas_campo_area_ha_check
          CHECK (area_ha IS NULL OR area_ha > 0);
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_visitas_campo_sub_etapa_id
      ON visitas_campo(sub_etapa_id);
  `
};
