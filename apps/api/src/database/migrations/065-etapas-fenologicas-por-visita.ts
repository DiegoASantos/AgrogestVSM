import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ETAPAS_FENOLOGICAS_POR_VISITA_MIGRATION: DatabaseMigration = {
  id: "065-etapas-fenologicas-por-visita",
  description: "Registra la distribución fenológica completa de cada visita.",
  sql: `
CREATE TABLE IF NOT EXISTS visita_etapas_fenologicas (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  visita_id bigint NOT NULL REFERENCES visitas_campo(id) ON DELETE CASCADE,
  etapa_fenologica_id bigint NOT NULL REFERENCES etapas_fenologicas(id) ON DELETE RESTRICT,
  sub_etapa_id bigint REFERENCES sub_etapas(id) ON DELETE RESTRICT,
  porcentaje_parcela smallint CHECK (porcentaje_parcela BETWEEN 1 AND 100),
  porcentaje_avance_labor numeric(5,2) CHECK (porcentaje_avance_labor BETWEEN 0 AND 100),
  orden integer NOT NULL CHECK (orden >= 0),
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_visita_etapas_visita_etapa UNIQUE (visita_id, etapa_fenologica_id),
  CONSTRAINT uq_visita_etapas_visita_orden UNIQUE (visita_id, orden)
);
CREATE INDEX IF NOT EXISTS idx_visita_etapas_visita ON visita_etapas_fenologicas(visita_id, orden);

INSERT INTO visita_etapas_fenologicas
  (visita_id, etapa_fenologica_id, sub_etapa_id, porcentaje_parcela, porcentaje_avance_labor, orden)
SELECT v.id, v.etapa_fenologica_id, v.sub_etapa_id,
       CASE WHEN e.tipo = 'Etapa' THEN 100 ELSE NULL END,
       CASE WHEN e.tipo = 'Labor' THEN v.sub_etapa_porcentaje ELSE NULL END, 0
FROM visitas_campo v
JOIN etapas_fenologicas e ON e.id = v.etapa_fenologica_id
WHERE NOT EXISTS (SELECT 1 FROM visita_etapas_fenologicas x WHERE x.visita_id = v.id);

-- Rollback operativo: volver al código previo, conservar esta tabla y los datos.
`
};
