import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_RIEGO_LABORES_MIGRATION: DatabaseMigration = {
  id: "013-visita-riego-labores",
  description: "Creates visit irrigation and cultural labor records.",
  sql: `
    CREATE TABLE IF NOT EXISTS visita_riegos (
      id bigserial PRIMARY KEY,
      visita_id bigint NOT NULL,
      tipo_riego_id bigint NOT NULL,
      fuente_agua varchar(20),
      tipo_suelo varchar(20),
      humedad_suelo varchar(25),
      estres_hidrico boolean,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_riegos_visita_id_key UNIQUE (visita_id),
      CONSTRAINT visita_riegos_visita_id_fkey
        FOREIGN KEY (visita_id) REFERENCES visitas_campo(id) ON DELETE CASCADE,
      CONSTRAINT visita_riegos_tipo_riego_id_fkey
        FOREIGN KEY (tipo_riego_id) REFERENCES tipos_riego(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS visita_labores_culturales (
      id bigserial PRIMARY KEY,
      visita_id bigint NOT NULL,
      labor_cultural_id bigint NOT NULL,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_labores_culturales_visita_labor_key
        UNIQUE (visita_id, labor_cultural_id),
      CONSTRAINT visita_labores_culturales_visita_id_fkey
        FOREIGN KEY (visita_id) REFERENCES visitas_campo(id) ON DELETE CASCADE,
      CONSTRAINT visita_labores_culturales_labor_cultural_id_fkey
        FOREIGN KEY (labor_cultural_id) REFERENCES labores_culturales(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_visita_riegos_visita_id
      ON visita_riegos(visita_id);
    CREATE INDEX IF NOT EXISTS idx_visita_labores_culturales_visita_id
      ON visita_labores_culturales(visita_id);
  `
};
