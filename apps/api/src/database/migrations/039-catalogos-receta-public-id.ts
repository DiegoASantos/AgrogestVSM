import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CATALOGOS_RECETA_PUBLIC_ID_MIGRATION: DatabaseMigration = {
  id: "039-catalogos-receta-public-id",
  description:
    "Agrega columna public_id UUID a ingredientes_activos, fertilizantes y marcas_producto para idempotencia de sincronización offline.",
  sql: `
    ALTER TABLE ingredientes_activos
      ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT gen_random_uuid();

    ALTER TABLE fertilizantes
      ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT gen_random_uuid();

    ALTER TABLE marcas_producto
      ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT gen_random_uuid();
  `
};
