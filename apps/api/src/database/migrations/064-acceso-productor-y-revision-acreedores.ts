import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ACCESO_PRODUCTOR_Y_REVISION_ACREEDORES_MIGRATION: DatabaseMigration = {
  id: "064-acceso-productor-y-revision-acreedores",
  description: "Agrega invitaciones de productor y revisión de acreedores de cosecha.",
  sql: `
ALTER TABLE acreedores_cosecha
  ADD COLUMN IF NOT EXISTS estado_aprobacion varchar(10) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS origen varchar(10) NOT NULL DEFAULT 'MOBILE',
  ADD COLUMN IF NOT EXISTS observacion_revision text,
  ADD COLUMN IF NOT EXISTS revisado_por_usuario_id bigint REFERENCES usuarios(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS revisado_at timestamptz;
ALTER TABLE acreedores_cosecha ALTER COLUMN creado_por_usuario_id DROP NOT NULL;
ALTER TABLE acreedores_cosecha
  ADD CONSTRAINT ck_acreedores_cosecha_estado_aprobacion
  CHECK (estado_aprobacion IN ('PENDING', 'APPROVED', 'OBSERVED'));
ALTER TABLE acreedores_cosecha
  ADD CONSTRAINT ck_acreedores_cosecha_origen
  CHECK (origen IN ('PRODUCTOR', 'MOBILE'));
ALTER TABLE acreedores_cosecha
  ADD CONSTRAINT ck_acreedores_cosecha_creador
  CHECK ((origen = 'PRODUCTOR' AND creado_por_usuario_id IS NULL) OR
         (origen = 'MOBILE' AND creado_por_usuario_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_acreedores_cosecha_revision
  ON acreedores_cosecha(estado_aprobacion, creado_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS invitaciones_acreedor_productor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  productor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  codigo_hash char(64) NOT NULL UNIQUE,
  emitido_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  expira_at timestamptz NOT NULL,
  revocado_at timestamptz,
  creado_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitacion_acreedor_activa_productor
  ON invitaciones_acreedor_productor(productor_id) WHERE revocado_at IS NULL;

CREATE TABLE IF NOT EXISTS revisiones_acreedor_cosecha (
  id bigserial PRIMARY KEY,
  acreedor_id bigint NOT NULL REFERENCES acreedores_cosecha(id) ON DELETE RESTRICT,
  revisor_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  decision varchar(10) NOT NULL CHECK (decision IN ('APPROVED', 'OBSERVED')),
  observacion text,
  creado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_revision_observada_nota CHECK
    (decision <> 'OBSERVED' OR length(btrim(observacion)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_revisiones_acreedor_cosecha
  ON revisiones_acreedor_cosecha(acreedor_id, creado_at DESC);

-- Rollback operativo: deshabilitar emisión/rutas y conservar decisiones y datos.
`
};
