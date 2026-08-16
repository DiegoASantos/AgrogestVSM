import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ESTADO_PRODUCTOR_DERIVADO_PARCELAS_MIGRATION: DatabaseMigration = {
  id: "047-estado-productor-derivado-parcelas",
  description:
    "Registra el creador del productor y alinea su estado con las parcelas activas.",
  sql: `
    ALTER TABLE productores
      ADD COLUMN IF NOT EXISTS creado_por_usuario_id BIGINT;

    ALTER TABLE productores
      DROP CONSTRAINT IF EXISTS productores_creado_por_usuario_id_fkey;

    ALTER TABLE productores
      ADD CONSTRAINT productores_creado_por_usuario_id_fkey
      FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id)
      ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_productores_creado_por_usuario
      ON productores(creado_por_usuario_id);

    UPDATE productores AS productor
    SET activo = EXISTS (
          SELECT 1
          FROM parcelas AS parcela
          WHERE parcela.productor_id = productor.id
            AND parcela.activo = TRUE
        ),
        actualizado_at = NOW()
    WHERE productor.activo IS DISTINCT FROM EXISTS (
      SELECT 1
      FROM parcelas AS parcela
      WHERE parcela.productor_id = productor.id
        AND parcela.activo = TRUE
    );

    -- Verificacion:
    -- SELECT COUNT(*) FROM productores p
    -- WHERE p.activo IS DISTINCT FROM EXISTS (
    --   SELECT 1 FROM parcelas pa
    --   WHERE pa.productor_id = p.id AND pa.activo = TRUE
    -- );
    --
    -- Rollback operativo:
    -- El estado anterior no puede reconstruirse de forma confiable porque era
    -- independiente de las parcelas. Restaurar desde el backup previo o aplicar
    -- una correccion hacia adelante aprobada.
  `
};
