import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const UNIFICACION_PRODUCTORES_MIGRATION: DatabaseMigration = {
  id: "070-unificacion-productores",
  description: "Casos, alias y auditoría de unificación de personas productoras.",
  sql: `
ALTER TABLE productores ADD COLUMN IF NOT EXISTS fusionado_en_id bigint REFERENCES productores(id) ON DELETE RESTRICT;
ALTER TABLE parcelas ADD COLUMN IF NOT EXISTS fusionada_en_id bigint REFERENCES parcelas(id) ON DELETE RESTRICT;
ALTER TABLE acreedores_cosecha ADD COLUMN IF NOT EXISTS fusionado_en_id bigint REFERENCES acreedores_cosecha(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_productores_fusionado_en ON productores(fusionado_en_id)
  WHERE fusionado_en_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcelas_fusionada_en ON parcelas(fusionada_en_id)
  WHERE fusionada_en_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acreedores_cosecha_fusionado_en ON acreedores_cosecha(fusionado_en_id)
  WHERE fusionado_en_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS productor_duplicado_casos (
  id bigserial PRIMARY KEY,
  productor_menor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  productor_mayor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  estado varchar(12) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'DESCARTADO', 'UNIFICADO')),
  motivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  resuelto_por_usuario_id bigint REFERENCES usuarios(id) ON DELETE RESTRICT,
  CHECK (productor_menor_id < productor_mayor_id),
  UNIQUE (productor_menor_id, productor_mayor_id)
);
CREATE INDEX IF NOT EXISTS idx_productor_duplicado_casos_pendientes
  ON productor_duplicado_casos(creado_at DESC, id DESC) WHERE estado = 'PENDIENTE';
CREATE TABLE IF NOT EXISTS productor_unificaciones (
  id bigserial PRIMARY KEY,
  caso_id bigint NOT NULL UNIQUE REFERENCES productor_duplicado_casos(id) ON DELETE RESTRICT,
  principal_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  secundario_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT,
  usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  manifiesto jsonb NOT NULL,
  creado_at timestamptz NOT NULL DEFAULT now()
);
-- Rollback operativo: retirar la interfaz y conservar alias y auditoría.
`
};
