import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITAS_COMERCIALES_MIGRATION: DatabaseMigration = {
  id: "073-visitas-comerciales",
  description: "Registros de visitas comerciales independientes de parcelas.",
  sql: `
CREATE TABLE IF NOT EXISTS visitas_comerciales (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  agronomo_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  tipo_sujeto varchar(12) NOT NULL CHECK (tipo_sujeto IN ('PERSONA','FUNDO','ASOCIATIVA','RECORREDOR')),
  nombres varchar(150) NOT NULL,
  apellidos varchar(150),
  descripcion text NOT NULL,
  fecha_visita date NOT NULL,
  ubicacion_visita geometry(Point, 4326),
  activo boolean NOT NULL DEFAULT true,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_visita_comercial_apellidos CHECK (
    (tipo_sujeto IN ('PERSONA','RECORREDOR') AND NULLIF(BTRIM(apellidos), '') IS NOT NULL)
    OR (tipo_sujeto IN ('FUNDO','ASOCIATIVA') AND apellidos IS NULL)
  )
);
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_visita_comercial_apellidos'
      AND conrelid = 'visitas_comerciales'::regclass
  ) THEN
    ALTER TABLE visitas_comerciales ADD CONSTRAINT chk_visita_comercial_apellidos
      CHECK ((tipo_sujeto IN ('PERSONA','RECORREDOR') AND NULLIF(BTRIM(apellidos), '') IS NOT NULL)
        OR (tipo_sujeto IN ('FUNDO','ASOCIATIVA') AND apellidos IS NULL));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_visita_comercial_tipo'
      AND conrelid = 'visitas_comerciales'::regclass
  ) THEN
    ALTER TABLE visitas_comerciales ADD CONSTRAINT chk_visita_comercial_tipo
      CHECK (tipo_sujeto IN ('PERSONA','FUNDO','ASOCIATIVA','RECORREDOR'));
  END IF;
END
$migration$;
CREATE INDEX IF NOT EXISTS idx_visitas_comerciales_fecha ON visitas_comerciales(fecha_visita DESC, id DESC) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_visitas_comerciales_agronomo_fecha ON visitas_comerciales(agronomo_usuario_id, fecha_visita DESC) WHERE activo = true;

-- Rollback operativo: revertir clientes y API conservando la tabla y registros;
-- no eliminar visitas comerciales ya sincronizadas.
`
};
