import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CONCENTRACIONES_PERMISO_ELIMINAR_VISITAS_MIGRATION: DatabaseMigration = {
  id: "050-concentraciones-permiso-eliminar-visitas",
  description:
    "Amplia concentraciones comerciales y agrega el permiso individual para eliminar visitas.",
  sql: `
    ALTER TABLE marcas_producto
      ALTER COLUMN concentracion TYPE varchar(300);

    ALTER TABLE fertilizantes
      ALTER COLUMN concentracion TYPE varchar(300);

    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS puede_eliminar_visitas boolean NOT NULL DEFAULT false;

    COMMENT ON COLUMN usuarios.puede_eliminar_visitas IS
      'Permite a un agronomo desactivar sus propias visitas desde mobile.';

    -- Rollback operativo: el codigo anterior ignora el permiso y PostgreSQL
    -- acepta varchar(300). No reducir las concentraciones a varchar(30) sin
    -- comprobar y normalizar primero todos los valores mayores a 30.
  `
};
