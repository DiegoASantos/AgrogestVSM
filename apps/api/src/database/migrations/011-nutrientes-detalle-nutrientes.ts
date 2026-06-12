import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const NUTRIENTES_DETALLE_NUTRIENTES_MIGRATION: DatabaseMigration = {
  id: "011-nutrientes-detalle-nutrientes",
  description: "Creates nutrition catalog tables for crops and nutrient details.",
  sql: `
    CREATE TABLE IF NOT EXISTS nutrientes (
      id bigserial PRIMARY KEY,
      cultivo_id bigint NOT NULL,
      nombre varchar(100) NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS detalle_nutrientes (
      id bigserial PRIMARY KEY,
      nutriente_id bigint NOT NULL,
      nombre varchar(100) NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'nutrientes_cultivo_fkey'
      ) THEN
        ALTER TABLE nutrientes
          ADD CONSTRAINT nutrientes_cultivo_fkey
          FOREIGN KEY (cultivo_id)
          REFERENCES cultivos(id)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'nutrientes_cultivo_nombre_key'
      ) THEN
        ALTER TABLE nutrientes
          ADD CONSTRAINT nutrientes_cultivo_nombre_key
          UNIQUE (cultivo_id, nombre);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'detalle_nutrientes_nutriente_fkey'
      ) THEN
        ALTER TABLE detalle_nutrientes
          ADD CONSTRAINT detalle_nutrientes_nutriente_fkey
          FOREIGN KEY (nutriente_id)
          REFERENCES nutrientes(id)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'detalle_nutrientes_nutriente_nombre_key'
      ) THEN
        ALTER TABLE detalle_nutrientes
          ADD CONSTRAINT detalle_nutrientes_nutriente_nombre_key
          UNIQUE (nutriente_id, nombre);
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_nutrientes_cultivo_id
      ON nutrientes(cultivo_id);

    CREATE INDEX IF NOT EXISTS idx_detalle_nutrientes_nutriente_id
      ON detalle_nutrientes(nutriente_id);
  `
};
