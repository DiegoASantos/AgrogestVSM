import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";
import { buildConcentracionesUnidadesRecetaSql } from "./037-concentraciones-unidades-receta";

export const REPARAR_CONCENTRACIONES_UNIDADES_RECETA_MIGRATION: DatabaseMigration = {
  id: "038-reparar-concentraciones-unidades-receta",
  description:
    "Reapplies the corrected recipe product catalog update without duplicating its source data.",
  sql: buildConcentracionesUnidadesRecetaSql(false)
};
