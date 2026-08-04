import { describe, expect, it } from "vitest";

import { RECETA_MEZCLAS_FACTOR_DOSIFICACION_MIGRATION } from "./040-receta-mezclas-factor-dosificacion";

describe("040 receta mezclas factor dosificacion", () => {
  const sql = RECETA_MEZCLAS_FACTOR_DOSIFICACION_MIGRATION.sql;

  it("crea mezclas y conserva columnas legacy", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_receta_mezclas");
    expect(sql).toContain("cantidad_total_producto");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS mezcla_id");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS dosis_producto");
    expect(sql).not.toContain("DROP COLUMN");
  });

  it("reconstruye mezclas historicas y agrega indices", () => {
    expect(sql).toContain("WHERE mezcla_id IS NULL");
    expect(sql).toContain("SET dosis_producto = dosis_ia");
    expect(sql).toContain("idx_visita_receta_fitosanidad_mezcla_id");
  });
});
