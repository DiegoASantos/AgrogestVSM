import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PAGOS_PRODUCTORES_MIGRATION: DatabaseMigration = {
  id: "066-pagos-productores",
  description:
    "Agrega pagos manuales a productores y habilita acreedores desde admin web.",
  sql: `
ALTER TABLE acreedores_cosecha
  DROP CONSTRAINT ck_acreedores_cosecha_origen,
  DROP CONSTRAINT ck_acreedores_cosecha_creador;
ALTER TABLE acreedores_cosecha
  ADD CONSTRAINT ck_acreedores_cosecha_origen
    CHECK (origen IN ('PRODUCTOR', 'MOBILE', 'ADMIN_WEB')),
  ADD CONSTRAINT ck_acreedores_cosecha_creador
    CHECK ((origen = 'PRODUCTOR' AND creado_por_usuario_id IS NULL) OR
           (origen IN ('MOBILE', 'ADMIN_WEB') AND creado_por_usuario_id IS NOT NULL));

CREATE TABLE pago_productores (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  productor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  sistema_origen varchar(150) NOT NULL,
  nro_guia varchar(150) NOT NULL,
  lote varchar(150) NOT NULL,
  protocolo varchar(10) NOT NULL,
  variedad varchar(150) NOT NULL,
  tipo_cultivo varchar(150) NOT NULL,
  categoria varchar(50) NOT NULL,
  destino varchar(150) NOT NULL,
  fecha_cosecha date NOT NULL,
  fecha_recepcion date NOT NULL,
  jabas integer NOT NULL,
  peso_bruto numeric(10,2) NOT NULL,
  peso_tara numeric(10,2) NOT NULL,
  peso_neto numeric(10,2) NOT NULL,
  peso_promedio numeric(10,2) NOT NULL,
  exportador varchar(10) NOT NULL,
  codigo_productor_origen varchar(150) NOT NULL,
  nombre_productor_origen varchar(250) NOT NULL,
  estado varchar(10) NOT NULL DEFAULT 'BORRADOR'
    CHECK (estado IN ('BORRADOR', 'OBSERVADO', 'PENDIENTE', 'PAGADO', 'ANULADO')),
  creado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pago_productores_productor_fecha
  ON pago_productores(productor_id, fecha_recepcion DESC, id DESC);
CREATE INDEX idx_pago_productores_estado_fecha
  ON pago_productores(estado, fecha_recepcion DESC, id DESC);

CREATE TABLE detalle_pago_productores (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  pago_productor_id bigint NOT NULL REFERENCES pago_productores(id) ON DELETE RESTRICT,
  acreedor_id bigint NOT NULL REFERENCES acreedores_cosecha(id) ON DELETE RESTRICT,
  tipo_documento_id_productor smallint NOT NULL REFERENCES tipos_documento(id) ON DELETE RESTRICT,
  nro_documento_productor varchar(20) NOT NULL,
  cantidad_jabas integer NOT NULL,
  precio_jaba numeric(10,2) NOT NULL,
  precio_kilo numeric(10,2) NOT NULL,
  porcentaje_peso numeric(10,2) NOT NULL CHECK (porcentaje_peso BETWEEN 0 AND 100),
  aplica_fairtrade boolean NOT NULL DEFAULT false,
  supervisor_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  sub_total numeric(10,2) NOT NULL,
  tipo_descuento varchar(200) NOT NULL DEFAULT 'NO_APLICA',
  monto_descuento numeric(10,2) NOT NULL DEFAULT 0.00,
  total_post_descuento numeric(10,2) NOT NULL,
  detraccion numeric(10,2) NOT NULL,
  total_post_detraccion numeric(10,2) NOT NULL,
  nro_liquidacion varchar(50),
  observacion varchar(300) NOT NULL,
  estado varchar(10) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('BORRADOR', 'OBSERVADO', 'PENDIENTE', 'PAGADO', 'ANULADO')),
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_detalle_pago_productores_pago
  ON detalle_pago_productores(pago_productor_id, creado_at, id);
CREATE INDEX idx_detalle_pago_productores_acreedor
  ON detalle_pago_productores(acreedor_id);
CREATE INDEX idx_detalle_pago_productores_supervisor
  ON detalle_pago_productores(supervisor_id);

-- Rollback operativo: retirar UI/rutas y conservar datos capturados; corregir hacia adelante.
`
};
