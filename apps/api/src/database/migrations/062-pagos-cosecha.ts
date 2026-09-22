import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PAGOS_COSECHA_MIGRATION: DatabaseMigration = {
  id: "062-pagos-cosecha",
  description: "Crea pagos de cosecha.",
  sql: `
CREATE TABLE IF NOT EXISTS pagos_cosecha (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  productor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  nombres_acreedor varchar(100) NOT NULL,
  apellidos_acreedor varchar(100) NOT NULL,
  tipo_documento_acreedor varchar(3) NOT NULL CHECK (tipo_documento_acreedor IN ('DNI', 'RUC')),
  nro_documento_acreedor varchar(11) NOT NULL CHECK (
    nro_documento_acreedor ~ '^[0-9]+$' AND
    ((tipo_documento_acreedor = 'DNI' AND char_length(nro_documento_acreedor) = 8) OR
     (tipo_documento_acreedor = 'RUC' AND char_length(nro_documento_acreedor) = 11))
  ),
  banco varchar(20) NOT NULL CHECK (banco IN ('INTERBANK', 'BCP', 'CAJA_PIURA', 'BBVA')),
  nro_cuenta varchar(30) NOT NULL CHECK (nro_cuenta ~ '^[0-9]{1,30}$'),
  creado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pagos_cosecha_productor ON pagos_cosecha(productor_id, creado_at DESC);
-- Rollback operativo: conservar la tabla aditiva y corregir hacia adelante.
`
};
