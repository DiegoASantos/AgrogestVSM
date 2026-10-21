import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const FOTOS_VISITAS_COMERCIALES_MIGRATION: DatabaseMigration = {
  id: "077-fotos-visitas-comerciales",
  description: "Vincula evidencia fotográfica opcional a visitas comerciales.",
  sql: `
ALTER TABLE fotos_comerciales_productor
  ADD COLUMN IF NOT EXISTS visita_comercial_id bigint REFERENCES visitas_comerciales(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_fotos_comerciales_visita
  ON fotos_comerciales_productor(visita_comercial_id, creado_at DESC, id DESC)
  WHERE visita_comercial_id IS NOT NULL;
-- Rollback operativo: mantener el vínculo y los archivos existentes; revertir
-- clientes preservando esta columna aditiva.
`
};
