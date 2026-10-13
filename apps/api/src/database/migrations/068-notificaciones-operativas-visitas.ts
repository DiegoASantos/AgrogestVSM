import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const NOTIFICACIONES_OPERATIVAS_VISITAS_MIGRATION: DatabaseMigration = {
  id: "068-notificaciones-operativas-visitas",
  description: "Guarda la lectura individual de visitas repetidas e indexa su agrupacion.",
  sql: `
CREATE TABLE IF NOT EXISTS notificaciones_visitas_leidas (
  usuario_id bigint NOT NULL REFERENCES usuarios(id),
  productor_id bigint NOT NULL REFERENCES productores(id),
  agronomo_usuario_id bigint NOT NULL REFERENCES usuarios(id),
  fecha_visita date NOT NULL,
  leido_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, productor_id, agronomo_usuario_id, fecha_visita)
);

CREATE INDEX IF NOT EXISTS idx_visitas_campo_fecha_agronomo_parcela_activa
  ON visitas_campo(fecha_visita DESC, agronomo_usuario_id, parcela_id)
  WHERE activo = true;

-- Rollback operativo: conservar las lecturas; la version anterior ignora esta tabla.
`
};
