import { describe, expect, it } from "vitest";

import { CONCENTRACIONES_UNIDADES_RECETA_MIGRATION } from "./037-concentraciones-unidades-receta";

const sql = CONCENTRACIONES_UNIDADES_RECETA_MIGRATION.sql;

describe("037-concentraciones-unidades-receta", () => {
  it("expands both catalogs with textual concentration and measurement unit", () => {
    expect(sql).toContain("ALTER COLUMN concentracion TYPE varchar(30)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS unidad_medida varchar(20)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS concentracion varchar(30)");
  });

  it("loads all source products with exact composite values", () => {
    expect(
      sql.match(
        /\('(?:[^']|'')*', '(?:[^']|'')*', '(?:[^']|'')*', '(?:[^']|'')*', '(?:[^']|'')*'\)/gu
      )
    ).toHaveLength(21);
    expect(
      sql.match(/\('(?:[^']|'')*', '(?:[^']|'')*', '(?:[^']|'')*', '(?:[^']|'')*'\)/gu)
    ).toHaveLength(15);
    expect(sql).toContain("'18-46-00', '%'");
    expect(sql).toContain("'Variado', '%'");
    expect(sql).toContain("'Variado', 'L'");
  });

  it("updates normalized existing rows and inserts only missing products", () => {
    expect(sql).toContain("lower(trim(existente.nombre))");
    expect(sql).toContain("WHERE NOT EXISTS");
    expect(sql).toContain("SET nombre = 'Austar 25 SC'");
    expect(sql).toContain("SET activo = false");
  });

  it("splits slash-separated fertilizer brands", () => {
    expect(sql).toContain("('Aminofol', 'liquido', '300', 'g/L')");
    expect(sql).toContain("('Isabion', 'liquido', '300', 'g/L')");
    expect(sql).toContain("('Alstar', 'liquido', '100', '%')");
    expect(sql).toContain("('Acadian', 'liquido', '100', '%')");
  });

  it("documents a forward-compatible operational rollback", () => {
    expect(sql).toContain("DROP TABLE catalogo_marcas_037");
    expect(sql).toContain("DROP TABLE catalogo_fertilizantes_037");
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("no se automatiza aqui");
  });
});
