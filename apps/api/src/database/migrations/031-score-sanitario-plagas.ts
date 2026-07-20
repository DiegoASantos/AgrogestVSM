import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const SCORE_SANITARIO_PLAGAS_MIGRATION: DatabaseMigration = {
  id: "031-score-sanitario-plagas",
  description: "Adds sanitary pest score metadata and explicit step completion.",
  sql: `
    ALTER TABLE niveles_incidencia_severidad
      ADD COLUMN IF NOT EXISTS grado smallint;
    UPDATE niveles_incidencia_severidad SET grado = valor_orden WHERE grado IS NULL;
    ALTER TABLE niveles_incidencia_severidad
      ALTER COLUMN grado SET NOT NULL;
    ALTER TABLE niveles_incidencia_severidad
      DROP CONSTRAINT IF EXISTS chk_niveles_incidencia_severidad_grado;
    ALTER TABLE niveles_incidencia_severidad
      ADD CONSTRAINT chk_niveles_incidencia_severidad_grado CHECK (grado BETWEEN 0 AND 3);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_niveles_incidencia_severidad_tipo_grado
      ON niveles_incidencia_severidad(tipo, grado);

    ALTER TABLE plagas_enfermedades ADD COLUMN IF NOT EXISTS codigo varchar(80);
    UPDATE plagas_enfermedades
      SET codigo = 'mosca_fruta'
      WHERE codigo IS NULL AND lower(nombre) IN ('mosca de la fruta', 'mosca fruta');
    CREATE UNIQUE INDEX IF NOT EXISTS uq_plagas_enfermedades_codigo
      ON plagas_enfermedades(codigo) WHERE codigo IS NOT NULL;

    ALTER TABLE visita_paso_observaciones
      ADD COLUMN IF NOT EXISTS finalizado_at timestamptz;
    CREATE INDEX IF NOT EXISTS idx_visita_paso_observaciones_finalizado
      ON visita_paso_observaciones(visita_id, paso, finalizado_at);

    CREATE INDEX IF NOT EXISTS idx_visitas_campo_campania_parcela_activo
      ON visitas_campo(campania_id, parcela_id, activo);

    -- Rollback operativo: desactivar endpoints y clientes nuevos; conservar
    -- columnas y datos. No eliminar finalizado_at ni datos offline en rollback.
  `
};
