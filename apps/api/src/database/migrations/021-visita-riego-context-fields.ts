import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_RIEGO_CONTEXT_FIELDS_MIGRATION: DatabaseMigration = {
  id: "021-visita-riego-context-fields",
  description: "Adds irrigation context fields expected by the visita riego API entity.",
  sql: `
    ALTER TABLE visita_riegos
      ADD COLUMN IF NOT EXISTS fuente_agua varchar(20);

    ALTER TABLE visita_riegos
      ADD COLUMN IF NOT EXISTS tipo_suelo varchar(20);

    ALTER TABLE visita_riegos
      ADD COLUMN IF NOT EXISTS humedad_suelo varchar(25);

    ALTER TABLE visita_riegos
      ADD COLUMN IF NOT EXISTS estres_hidrico boolean;
  `
};
