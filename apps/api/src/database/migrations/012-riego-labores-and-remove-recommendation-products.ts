import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const RIEGO_LABORES_AND_REMOVE_RECOMMENDATION_PRODUCTS_MIGRATION: DatabaseMigration = {
  id: "012-riego-labores-and-remove-recommendation-products",
  description:
    "Creates irrigation and cultural labor catalogs and removes recommendation/product catalogs.",
  sql: `
    CREATE TABLE IF NOT EXISTS tipos_riego (
      id bigserial PRIMARY KEY,
      nombre varchar(100) NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tipos_riego_nombre_key UNIQUE (nombre)
    );

    CREATE TABLE IF NOT EXISTS labores_culturales (
      id bigserial PRIMARY KEY,
      nombre varchar(100) NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT labores_culturales_nombre_key UNIQUE (nombre)
    );

    DROP TABLE IF EXISTS visita_productos_recomendados CASCADE;
    DROP TABLE IF EXISTS producto_ingredientes CASCADE;
    DROP TABLE IF EXISTS productos CASCADE;
    DROP TABLE IF EXISTS ingredientes_activos CASCADE;
    DROP TABLE IF EXISTS frecuencias_aplicacion CASCADE;

    DROP TABLE IF EXISTS visita_recomendaciones CASCADE;
    DROP TABLE IF EXISTS tipos_recomendacion CASCADE;
  `
};
