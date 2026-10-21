import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITAS_COMERCIALES_PRODUCTORES_MIGRATION: DatabaseMigration = {
  id: "076-visitas-comerciales-productores",
  description: "Tipos adicionales de productor y vínculo opcional de visitas comerciales.",
  sql: `
ALTER TABLE productores DROP CONSTRAINT IF EXISTS chk_productores_entidad;
ALTER TABLE productores ADD CONSTRAINT chk_productores_entidad
  CHECK (entidad IN ('persona', 'fundo', 'asociacion', 'cooperativa', 'recorredor'));
ALTER TABLE visitas_comerciales ADD COLUMN IF NOT EXISTS productor_id bigint REFERENCES productores(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_visitas_comerciales_productor ON visitas_comerciales(productor_id, fecha_visita DESC) WHERE productor_id IS NOT NULL;
DO $migration$
DECLARE constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'visitas_comerciales'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%tipo_sujeto%'
  LOOP
    EXECUTE format('ALTER TABLE visitas_comerciales DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END
$migration$;
ALTER TABLE visitas_comerciales ADD CONSTRAINT chk_visita_comercial_tipo
  CHECK (tipo_sujeto IN ('PERSONA', 'FUNDO', 'ASOCIATIVA', 'COOPERATIVA', 'RECORREDOR'));
ALTER TABLE visitas_comerciales ADD CONSTRAINT chk_visita_comercial_apellidos
  CHECK ((tipo_sujeto IN ('PERSONA', 'RECORREDOR') AND NULLIF(BTRIM(apellidos), '') IS NOT NULL)
    OR (tipo_sujeto IN ('FUNDO', 'ASOCIATIVA', 'COOPERATIVA') AND apellidos IS NULL));
-- Rollback operativo: conservar tipos y vínculos ya escritos; revertir clientes
-- y API solo a versiones que acepten columnas adicionales y códigos históricos.
`
};
