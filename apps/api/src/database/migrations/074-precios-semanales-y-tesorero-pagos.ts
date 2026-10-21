import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PRECIOS_SEMANALES_Y_TESORERO_PAGOS_MIGRATION: DatabaseMigration = {
  id: "074-precios-semanales-y-tesorero-pagos",
  description: "Agrega precios semanales por jaba y el rol Tesorero Pagos sin asignar usuarios.",
  sql: `
    CREATE TABLE IF NOT EXISTS estimaciones_precios (
      id bigserial PRIMARY KEY,
      public_id uuid NOT NULL DEFAULT gen_random_uuid(),
      fecha_inicio date NOT NULL,
      fecha_fin date NOT NULL,
      precio_minimo numeric(12,2) NOT NULL,
      precio_maximo numeric(12,2) NOT NULL,
      creado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
      actualizado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_estimaciones_precios_public_id UNIQUE (public_id),
      CONSTRAINT uq_estimaciones_precios_semana UNIQUE (fecha_inicio),
      CONSTRAINT ck_estimaciones_precios_inicio_lunes CHECK (EXTRACT(ISODOW FROM fecha_inicio) = 1),
      CONSTRAINT ck_estimaciones_precios_rango_semanal CHECK (fecha_fin = fecha_inicio + 6),
      CONSTRAINT ck_estimaciones_precios_importes CHECK (
        precio_minimo >= 0 AND precio_maximo >= precio_minimo
        AND precio_maximo <= 9999999999.99
      )
    );
    INSERT INTO roles (codigo, nombre, descripcion)
    SELECT 'TESORERO_PAGOS', 'Tesorero Pagos',
      'Gestion de productores, parcelas, acreedores de cosecha y pagos.'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE codigo = 'TESORERO_PAGOS');

    -- Rollback: conservar tabla y datos al revertir aplicaciones. Antes de volver
    -- a una API antigua, retirar asignaciones TESORERO_PAGOS y revocar sesiones.
    -- Solo con respaldo y aprobacion explicita, sin asignaciones dependientes:
    -- DELETE FROM roles WHERE codigo = 'TESORERO_PAGOS';
    -- DROP TABLE estimaciones_precios;
  `
};
