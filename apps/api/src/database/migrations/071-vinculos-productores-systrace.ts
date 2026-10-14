import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VINCULOS_PRODUCTORES_SYSTRACE_MIGRATION: DatabaseMigration = {
  id: "071-vinculos-productores-systrace",
  description: "Vínculos confirmados entre códigos Systrace y productores AgroGest.",
  sql: `
CREATE TABLE IF NOT EXISTS vinculos_productores_systrace (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  codigo_productor_systrace varchar(150) NOT NULL UNIQUE,
  productor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  creado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  actualizado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_vinculo_systrace_codigo_no_vacio CHECK (length(trim(codigo_productor_systrace)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_vinculos_systrace_productor
  ON vinculos_productores_systrace(productor_id);
CREATE TABLE IF NOT EXISTS vinculos_productores_systrace_cambios (
  id bigserial PRIMARY KEY,
  vinculo_id bigint NOT NULL REFERENCES vinculos_productores_systrace(id) ON DELETE RESTRICT,
  productor_anterior_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  productor_nuevo_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vinculos_systrace_cambios_vinculo
  ON vinculos_productores_systrace_cambios(vinculo_id, creado_at DESC);
-- Rollback operativo: retirar el acceso a vínculos y conservar la tabla.
`
};
