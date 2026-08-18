import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const FERTILIZACION_DEFICIENCIA_NUTRICIONAL_MIGRATION: DatabaseMigration = {
  id: "052-fertilizacion-deficiencia-nutricional",
  description:
    "Relaciona cada producto fertilizante recomendado con su nutriente objetivo.",
  sql: `
    ALTER TABLE visita_receta_fertilizacion
      ADD COLUMN IF NOT EXISTS nutriente_id bigint,
      ADD COLUMN IF NOT EXISTS nutriente_nombre varchar(100);

    ALTER TABLE visita_receta_fertilizacion
      DROP CONSTRAINT IF EXISTS fk_visita_receta_fertilizacion_nutriente;

    ALTER TABLE visita_receta_fertilizacion
      ADD CONSTRAINT fk_visita_receta_fertilizacion_nutriente
        FOREIGN KEY (nutriente_id) REFERENCES nutrientes(id)
        ON UPDATE NO ACTION ON DELETE RESTRICT;

    CREATE INDEX IF NOT EXISTS idx_visita_receta_fertilizacion_nutriente
      ON visita_receta_fertilizacion(nutriente_id);

    COMMENT ON COLUMN visita_receta_fertilizacion.nutriente_id IS
      'Nutriente objetivo de la recomendacion; nullable para recetas legacy.';
    COMMENT ON COLUMN visita_receta_fertilizacion.nutriente_nombre IS
      'Instantanea del nombre canonico para historial y reportes.';

    -- Rollback operativo preferido: conservar las columnas nullable y desplegar
    -- la version anterior. La contraccion posterior elimina primero el indice y
    -- la FK, y solo despues las columnas, cuando no existan clientes escritores.
  `
};
