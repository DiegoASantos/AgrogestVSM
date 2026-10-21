import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ALERTAS_VISITAS_PRODUCTOR_DIA_MIGRATION: DatabaseMigration = {
  id: "075-alertas-visitas-productor-dia",
  description: "Registra la lectura de visitas repetidas por productor y fecha.",
  sql: `
CREATE TABLE IF NOT EXISTS notificaciones_visitas_productor_leidas (
  usuario_id bigint NOT NULL REFERENCES usuarios(id),
  productor_id bigint NOT NULL REFERENCES productores(id),
  fecha_visita date NOT NULL,
  leido_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, productor_id, fecha_visita)
);

INSERT INTO notificaciones_visitas_productor_leidas
  (usuario_id, productor_id, fecha_visita, leido_at)
SELECT DISTINCT anterior.usuario_id, anterior.productor_id,
       anterior.fecha_visita, anterior.leido_at
FROM notificaciones_visitas_leidas anterior
WHERE NOT EXISTS (
  SELECT 1
  FROM visitas_campo visita
  JOIN parcelas parcela ON parcela.id = visita.parcela_id
  WHERE visita.activo = true
    AND parcela.productor_id = anterior.productor_id
    AND visita.fecha_visita = anterior.fecha_visita
    AND NOT EXISTS (
      SELECT 1 FROM notificaciones_visitas_leidas otra
      WHERE otra.usuario_id = anterior.usuario_id
        AND otra.productor_id = anterior.productor_id
        AND otra.fecha_visita = anterior.fecha_visita
        AND otra.agronomo_usuario_id = visita.agronomo_usuario_id
    )
)
ON CONFLICT (usuario_id, productor_id, fecha_visita) DO NOTHING;

-- Rollback operativo: conservar ambas tablas de lecturas y volver al codigo anterior.
`
};
