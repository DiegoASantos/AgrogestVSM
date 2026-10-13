import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const FOTOS_COMERCIALES_PRODUCTOR_MIGRATION: DatabaseMigration = {
  id: "069-fotos-comerciales-productor",
  description: "Metadatos y auditoría de fotos comerciales privadas por productor.",
  sql: `
CREATE TABLE IF NOT EXISTS fotos_comerciales_productor (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL UNIQUE,
  productor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  creado_por_usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  storage_key uuid NOT NULL UNIQUE,
  sha256_original char(64) NOT NULL,
  sha256_archivo char(64) NOT NULL,
  tamano_bytes integer NOT NULL CHECK (tamano_bytes > 0),
  mime_type varchar(30) NOT NULL CHECK (mime_type = 'image/jpeg'),
  nonce_hex char(24) NOT NULL,
  auth_tag_hex char(32) NOT NULL,
  key_version smallint NOT NULL DEFAULT 1,
  creado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fotos_comerciales_productor_fecha
  ON fotos_comerciales_productor(productor_id, creado_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS fotos_comerciales_accesos (
  id bigserial PRIMARY KEY,
  foto_id bigint NOT NULL REFERENCES fotos_comerciales_productor(id) ON DELETE RESTRICT,
  usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  accion varchar(20) NOT NULL CHECK (accion = 'VER'),
  creado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fotos_comerciales_accesos_foto_fecha
  ON fotos_comerciales_accesos(foto_id, creado_at DESC);
-- Rollback operativo: retirar endpoints y conservar metadatos, fotos y auditoría.
`
};
