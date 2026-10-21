import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ACREEDORES_INCOMPLETOS_FOTOS_MIGRATION: DatabaseMigration = {
  id: "078-acreedores-incompletos-fotos",
  description: "Permite identidad de acreedor sin cuenta y vincula sus fotografías.",
  sql: `
ALTER TABLE acreedores_cosecha ALTER COLUMN banco DROP NOT NULL;
ALTER TABLE acreedores_cosecha ALTER COLUMN nro_cuenta DROP NOT NULL;
ALTER TABLE acreedores_cosecha DROP CONSTRAINT IF EXISTS ck_acreedores_cosecha_estado_aprobacion;
ALTER TABLE acreedores_cosecha ADD CONSTRAINT ck_acreedores_cosecha_estado_aprobacion
  CHECK (estado_aprobacion IN ('INCOMPLETE', 'PENDING', 'APPROVED', 'OBSERVED'));
ALTER TABLE acreedores_cosecha ADD CONSTRAINT chk_acreedor_cuenta_estado
  CHECK ((estado_aprobacion = 'INCOMPLETE' AND banco IS NULL AND nro_cuenta IS NULL)
    OR (estado_aprobacion <> 'INCOMPLETE' AND banco IS NOT NULL AND nro_cuenta IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS uq_acreedor_identidad_incompleta
  ON acreedores_cosecha(productor_id, tipo_documento_acreedor, nro_documento_acreedor)
  WHERE estado_aprobacion = 'INCOMPLETE' AND fusionado_en_id IS NULL;
ALTER TABLE fotos_comerciales_productor
  ADD COLUMN IF NOT EXISTS acreedor_id bigint REFERENCES acreedores_cosecha(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_fotos_comerciales_acreedor
  ON fotos_comerciales_productor(acreedor_id, creado_at DESC, id DESC)
  WHERE acreedor_id IS NOT NULL;
-- Rollback operativo: conservar filas INCOMPLETE e imágenes; corregir hacia
-- adelante, sin restaurar NOT NULL mientras existan registros incompletos.
`
};
