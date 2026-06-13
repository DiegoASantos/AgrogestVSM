import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const OPERATIONAL_CATALOGS_MIGRATION: DatabaseMigration = {
  id: "012-operational-catalogs",
  description: "Creates irrigation and cultural labor catalogs.",
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

  `
};
