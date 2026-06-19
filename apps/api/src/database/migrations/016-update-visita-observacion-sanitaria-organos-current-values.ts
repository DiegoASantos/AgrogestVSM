import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const UPDATE_VISITA_OBSERVACION_SANITARIA_ORGANOS_CURRENT_VALUES_MIGRATION: DatabaseMigration =
  {
    id: "016-update-visita-observacion-sanitaria-organos-current-values",
    description:
      "Updates affected plant organ values to the current sanitary observation catalog.",
    sql: `
      ALTER TABLE visita_observacion_sanitaria_organos
        DROP CONSTRAINT IF EXISTS visita_observacion_sanitaria_organos_organo_check;

      UPDATE visita_observacion_sanitaria_organos
      SET organo = CASE organo
        WHEN 'tallo' THEN 'tronco_rama'
        WHEN 'flores' THEN 'flor_individual'
        WHEN 'fruto' THEN 'fruto_verde'
        WHEN 'hoja' THEN 'hoja_tierna'
        ELSE organo
      END
      WHERE organo IN ('tallo', 'flores', 'fruto', 'hoja');

      ALTER TABLE visita_observacion_sanitaria_organos
        ADD CONSTRAINT visita_observacion_sanitaria_organos_organo_check
        CHECK (organo IN ('tronco_rama', 'yema_apical', 'brote_vegetativo', 'hoja_tierna', 'hoja_madura', 'panicula_floral', 'flor_individual', 'fruto_recien_cuajado', 'fruto_verde', 'fruto_maduro', 'raices'));
    `
  };
