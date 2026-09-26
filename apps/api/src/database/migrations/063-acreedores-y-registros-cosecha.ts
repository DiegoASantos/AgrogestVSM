import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ACREEDORES_Y_REGISTROS_COSECHA_MIGRATION: DatabaseMigration = {
  id: "063-acreedores-y-registros-cosecha",
  description: "Crea acreedores reutilizables y registros de cosecha.",
  sql: `
CREATE TABLE IF NOT EXISTS acreedores_cosecha (
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
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_acreedores_cosecha_datos UNIQUE (
    productor_id, tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta
  )
);
CREATE INDEX IF NOT EXISTS idx_acreedores_cosecha_productor
  ON acreedores_cosecha(productor_id, creado_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS registros_cosecha (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  productor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  acreedor_id bigint NOT NULL REFERENCES acreedores_cosecha(id) ON DELETE RESTRICT,
  cantidad_jabas integer NOT NULL CHECK (cantidad_jabas > 0),
  precio_jaba numeric(12,2) NOT NULL CHECK (precio_jaba > 0),
  fecha_registro date NOT NULL,
  fecha_cosecha date NOT NULL CHECK (fecha_cosecha <= fecha_registro),
  nombres_acreedor varchar(100) NOT NULL,
  apellidos_acreedor varchar(100) NOT NULL,
  tipo_documento_acreedor varchar(3) NOT NULL CHECK (tipo_documento_acreedor IN ('DNI', 'RUC')),
  nro_documento_acreedor varchar(11) NOT NULL,
  banco varchar(20) NOT NULL CHECK (banco IN ('INTERBANK', 'BCP', 'CAJA_PIURA', 'BBVA')),
  nro_cuenta varchar(30) NOT NULL,
  creado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registros_cosecha_productor_fecha
  ON registros_cosecha(productor_id, fecha_registro DESC, id DESC);

INSERT INTO acreedores_cosecha (
  productor_id, nombres_acreedor, apellidos_acreedor, tipo_documento_acreedor,
  nro_documento_acreedor, banco, nro_cuenta, creado_por_usuario_id, creado_at, actualizado_at
)
SELECT DISTINCT ON (
  productor_id, tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta
)
  productor_id, nombres_acreedor, apellidos_acreedor, tipo_documento_acreedor,
  nro_documento_acreedor, banco, nro_cuenta, creado_por_usuario_id, creado_at, actualizado_at
FROM pagos_cosecha
ORDER BY productor_id, tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
  creado_at ASC, id ASC
ON CONFLICT ON CONSTRAINT uq_acreedores_cosecha_datos DO NOTHING;

-- Rollback operativo: conservar las tablas aditivas y corregir hacia adelante.
`
};
