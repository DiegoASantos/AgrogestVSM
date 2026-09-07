import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ESTIMACIONES_VISITAS_SEMANALES_MIGRATION: DatabaseMigration = {
  id: "060-estimaciones-visitas-semanales",
  description:
    "Crea estimaciones semanales de visitas por agronomo con auditoria y soporte para comparar visitas reales.",
  sql: `
    CREATE TABLE IF NOT EXISTS estimaciones_visitas (
      id bigserial PRIMARY KEY,
      public_id uuid NOT NULL DEFAULT gen_random_uuid(),
      agronomo_usuario_id bigint NOT NULL,
      fecha_inicio date NOT NULL,
      fecha_fin date NOT NULL,
      visitas_estimadas integer NOT NULL,
      creado_por_usuario_id bigint NOT NULL,
      actualizado_por_usuario_id bigint NOT NULL,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_estimaciones_visitas_public_id UNIQUE (public_id),
      CONSTRAINT uq_estimaciones_visitas_agronomo_semana
        UNIQUE (agronomo_usuario_id, fecha_inicio),
      CONSTRAINT ck_estimaciones_visitas_cantidad_no_negativa
        CHECK (visitas_estimadas >= 0),
      CONSTRAINT ck_estimaciones_visitas_inicio_lunes
        CHECK (EXTRACT(ISODOW FROM fecha_inicio) = 1),
      CONSTRAINT ck_estimaciones_visitas_rango_semanal
        CHECK (fecha_fin = fecha_inicio + 6),
      CONSTRAINT fk_estimaciones_visitas_agronomo
        FOREIGN KEY (agronomo_usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT fk_estimaciones_visitas_creado_por
        FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT fk_estimaciones_visitas_actualizado_por
        FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION
    );

    CREATE INDEX IF NOT EXISTS idx_estimaciones_visitas_semana_activa
      ON estimaciones_visitas(fecha_inicio, agronomo_usuario_id)
      WHERE activo = true;

    CREATE INDEX IF NOT EXISTS idx_visitas_campo_agronomo_fecha_activa
      ON visitas_campo(agronomo_usuario_id, fecha_visita)
      WHERE activo = true;

    COMMENT ON TABLE estimaciones_visitas IS
      'Metas semanales de visitas por agronomo y su auditoria de ultima modificacion.';

    -- Rollback operativo preferido: retirar primero web y API y conservar esta
    -- tabla para no perder metas. Solo con respaldo y autorizacion explicita:
    -- DROP INDEX IF EXISTS idx_visitas_campo_agronomo_fecha_activa;
    -- DROP TABLE IF EXISTS estimaciones_visitas;
  `
};
