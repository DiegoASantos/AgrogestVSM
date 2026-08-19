import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const DOSIS_COADYUVANTES_POR_MEZCLA_MIGRATION: DatabaseMigration = {
  id: "054-dosis-coadyuvantes-por-mezcla",
  description: "Agrega la dosis libre de cada coadyuvante seleccionado por mezcla.",
  sql: `
    ALTER TABLE visita_receta_mezclas
      ADD COLUMN IF NOT EXISTS coadyuvantes_dosis text;

    COMMENT ON COLUMN visita_receta_mezclas.coadyuvantes_dosis IS
      'JSON object opcional que relaciona cada id de coadyuvante con su dosis libre.';

    -- Rollback operativo: desplegar primero codigo anterior y conservar la
    -- columna durante la ventana de clientes mobile instalados. Una contraccion
    -- posterior puede ejecutar:
    -- ALTER TABLE visita_receta_mezclas DROP COLUMN coadyuvantes_dosis;
  `
};
