import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const AVISOS_VISITAS_PRODUCTORES_MIGRATION: DatabaseMigration = {
  id: "067-avisos-visitas-productores",
  description: "Registra continuidad confirmada e indexa visitas por parcela y fecha.",
  sql: `
ALTER TABLE productores
  ADD COLUMN IF NOT EXISTS ultima_confirmacion_continuidad_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_visitas_campo_parcela_fecha_activa
  ON visitas_campo(parcela_id, fecha_visita DESC)
  WHERE activo = true;

-- Rollback operativo: conservar la columna y las confirmaciones; corregir hacia adelante.
`
};
