import { describe, expect, it } from "vitest";

import { FERTILIZACION_DEFICIENCIA_NUTRICIONAL_MIGRATION } from "./052-fertilizacion-deficiencia-nutricional";

describe("052 fertilizacion por deficiencia nutricional", () => {
  const sql = FERTILIZACION_DEFICIENCIA_NUTRICIONAL_MIGRATION.sql;

  it("agrega columnas nullable compatibles con recetas historicas", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS nutriente_id bigint");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS nutriente_nombre varchar(100)");
    expect(sql).not.toContain("NOT NULL");
  });

  it("protege la referencia al catalogo e indexa las consultas", () => {
    expect(sql).toContain("REFERENCES nutrientes(id)");
    expect(sql).toContain("ON UPDATE NO ACTION ON DELETE RESTRICT");
    expect(sql).toContain("idx_visita_receta_fertilizacion_nutriente");
  });

  it("documenta rollback sin contraccion inmediata", () => {
    expect(sql).toContain("Rollback operativo preferido");
    expect(sql).not.toContain("DROP COLUMN");
  });
});
