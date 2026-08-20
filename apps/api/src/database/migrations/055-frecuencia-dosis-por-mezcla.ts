import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const FRECUENCIA_DOSIS_POR_MEZCLA_MIGRATION: DatabaseMigration = {
  id: "055-frecuencia-dosis-por-mezcla",
  description: "Agrega la frecuencia de dosis indicada para cada mezcla de receta.",
  sql: `
    ALTER TABLE visita_receta_mezclas
      ADD COLUMN IF NOT EXISTS frecuencia_dosis text;

    COMMENT ON COLUMN visita_receta_mezclas.frecuencia_dosis IS
      'Texto tecnico opcional para clientes historicos; obligatorio al finalizar mezclas nuevas.';

    -- Rollback operativo: desplegar codigo anterior y conservar la columna
    -- mientras existan clientes mobile que la envien. Una contraccion posterior
    -- aprobada puede ejecutar:
    -- ALTER TABLE visita_receta_mezclas DROP COLUMN frecuencia_dosis;
  `
};
