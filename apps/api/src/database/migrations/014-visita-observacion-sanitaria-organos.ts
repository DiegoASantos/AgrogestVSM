import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_OBSERVACION_SANITARIA_ORGANOS_MIGRATION: DatabaseMigration = {
  id: "014-visita-observacion-sanitaria-organos",
  description: "Creates affected plant organ records for visit sanitary observations.",
  sql: `
    CREATE TABLE IF NOT EXISTS visita_observacion_sanitaria_organos (
      id bigserial PRIMARY KEY,
      visita_observacion_sanitaria_id bigint NOT NULL,
      organo varchar(20) NOT NULL,
      creado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_observacion_sanitaria_organos_organo_check
        CHECK (organo IN ('hoja', 'tallo', 'flores', 'fruto')),
      CONSTRAINT visita_observacion_sanitaria_organos_observacion_fkey
        FOREIGN KEY (visita_observacion_sanitaria_id)
        REFERENCES visita_observaciones_sanitarias(id)
        ON DELETE CASCADE,
      CONSTRAINT visita_observacion_sanitaria_organos_unique
        UNIQUE (visita_observacion_sanitaria_id, organo)
    );

    CREATE INDEX IF NOT EXISTS idx_visita_obs_sanitaria_organos_observacion
      ON visita_observacion_sanitaria_organos(visita_observacion_sanitaria_id);
  `
};
