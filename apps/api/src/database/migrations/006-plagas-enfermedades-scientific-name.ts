import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PLAGAS_ENFERMEDADES_SCIENTIFIC_NAME_MIGRATION: DatabaseMigration = {
  id: "006-plagas-enfermedades-scientific-name",
  description:
    "Replaces pest and disease catalog codes with scientific names.",
  sql: `
    ALTER TABLE plagas_enfermedades
      ADD COLUMN IF NOT EXISTS nombre_cientifico varchar(160);

    ALTER TABLE plagas_enfermedades
      DROP COLUMN IF EXISTS codigo;
  `
};
