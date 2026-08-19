import { describe, expect, it } from "vitest";

import { RECETA_MEZCLAS_PRODUCTOS_REUTILIZABLES_MIGRATION } from "./053-receta-mezclas-productos-reutilizables";

describe("053 productos reutilizables por mezcla", () => {
  const sql = RECETA_MEZCLAS_PRODUCTOS_REUTILIZABLES_MIGRATION.sql;

  it("agrega referencias y asociacion de fertilizante sin cambiar la hora de visita", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS producto_ref");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS mezcla_id bigint");
    expect(sql).toContain("REFERENCES visita_receta_mezclas(id) ON DELETE CASCADE");
    expect(sql).not.toContain("hora_visita_fin");
  });

  it("rellena recetas historicas e indexa las nuevas relaciones", () => {
    expect(sql).toContain("legacy-fito-");
    expect(sql).toContain("legacy-fert-");
    expect(sql).toContain("idx_receta_fertilizacion_mezcla");
  });
});
