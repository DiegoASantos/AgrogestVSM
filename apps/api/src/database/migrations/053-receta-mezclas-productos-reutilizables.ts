import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const RECETA_MEZCLAS_PRODUCTOS_REUTILIZABLES_MIGRATION: DatabaseMigration = {
  id: "053-receta-mezclas-productos-reutilizables",
  description:
    "Relaciona fertilizantes con mezclas y agrega referencias estables para reutilizar productos.",
  sql: `
    ALTER TABLE visita_receta_fitosanidad
      ADD COLUMN IF NOT EXISTS producto_ref varchar(100);

    ALTER TABLE visita_receta_fertilizacion
      ADD COLUMN IF NOT EXISTS producto_ref varchar(100),
      ADD COLUMN IF NOT EXISTS mezcla_id bigint;

    UPDATE visita_receta_fitosanidad
       SET producto_ref = 'legacy-fito-' || id::text
     WHERE producto_ref IS NULL;

    UPDATE visita_receta_fertilizacion
       SET producto_ref = 'legacy-fert-' || id::text
     WHERE producto_ref IS NULL;

    ALTER TABLE visita_receta_fitosanidad
      ALTER COLUMN producto_ref SET NOT NULL;

    ALTER TABLE visita_receta_fertilizacion
      ALTER COLUMN producto_ref SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'visita_receta_fertilizacion_mezcla_id_fkey'
      ) THEN
        ALTER TABLE visita_receta_fertilizacion
          ADD CONSTRAINT visita_receta_fertilizacion_mezcla_id_fkey
          FOREIGN KEY (mezcla_id) REFERENCES visita_receta_mezclas(id) ON DELETE CASCADE;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_receta_fitosanidad_producto_ref
      ON visita_receta_fitosanidad(receta_id, producto_ref);
    CREATE INDEX IF NOT EXISTS idx_receta_fertilizacion_producto_ref
      ON visita_receta_fertilizacion(receta_id, producto_ref);
    CREATE INDEX IF NOT EXISTS idx_receta_fertilizacion_mezcla
      ON visita_receta_fertilizacion(mezcla_id);

    -- Rollback operativo: desplegar primero codigo anterior. Luego pueden
    -- retirarse FK, indices y columnas; no hacerlo mientras existan clientes
    -- que envien productoRef o mezclaNumero.
  `
};
