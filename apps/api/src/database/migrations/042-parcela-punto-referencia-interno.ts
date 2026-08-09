import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const PARCELA_PUNTO_REFERENCIA_INTERNO_MIGRATION: DatabaseMigration = {
  id: "042-parcela-punto-referencia-interno",
  description:
    "Adds a nullable internal parcel reference point without changing the existing property access point.",
  sql: `
    ALTER TABLE parcelas
      ADD COLUMN IF NOT EXISTS punto_referencia_parcela geometry(Point, 4326);

    -- Rollback operativo: desplegar primero una version de la aplicacion que
    -- deje de escribir el campo. La columna es nullable y compatible con
    -- versiones anteriores, por lo que no se automatiza DROP COLUMN ni se
    -- eliminan geodatos capturados.
  `
};
