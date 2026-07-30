import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const FIX_SUNSHINE_DURATION_UNITS_MIGRATION: DatabaseMigration = {
  id: "033-fix-sunshine-duration-units",
  description: "Convierte sunshine_duration de segundos a horas en pronósticos existentes.",
  sql: `
    UPDATE clima.pronosticos
       SET valor     = ROUND((valor / 3600)::numeric, 2),
           unidad    = 'h'
     WHERE variable  = 'sunshine_duration'
       AND valor     > 24;
  `
};
