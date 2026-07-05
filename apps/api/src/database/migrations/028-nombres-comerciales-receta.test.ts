import { describe, expect, it } from "vitest";

import { NOMBRES_COMERCIALES_RECETA_MIGRATION } from "./028-nombres-comerciales-receta";

const sql = NOMBRES_COMERCIALES_RECETA_MIGRATION.sql;

describe("028-nombres-comerciales-receta migration", () => {
  it("links commercial names to fitosanitary product types", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS tipo_producto_id bigint");
    expect(sql).toContain("marcas_producto_tipo_producto_id_fkey");
    expect(sql).toContain("idx_marcas_producto_tipo_producto_id");
  });

  it("seeds product types from the guide images", () => {
    expect(sql).toContain("('Reg. Crecimiento')");
    expect(sql).toContain("('Adherente/pegante')");
    expect(sql).toContain("('Tensoactivo')");
    expect(sql).toContain("('Corrector de pH')");
    expect(sql).toContain("('Ablandador de agua')");
  });

  it("seeds ingredients and commercial names from the guide images", () => {
    expect(sql).toContain("('Thiabendazole')");
    expect(sql).toContain("('Paclobutrazol')");
    expect(sql).toContain("('Poliéster modificado')");
    expect(sql).toContain("('Fungicida', 'Thiabendazole', 'Mertect 500 SC')");
    expect(sql).toContain("('Tensoactivo', 'Poliéster modificado', 'Silwet L-77')");
    expect(sql).toContain(
      "('Ablandador de agua', 'Secuestrante de sales', 'Cosmo-In D')"
    );
  });

  it("updates existing catalog rows before inserting missing ones", () => {
    expect(sql).toContain("UPDATE marcas_producto marca");
    expect(sql).toContain("INSERT INTO marcas_producto");
    expect(sql).toContain("WHERE NOT EXISTS");
  });

  it("documents operational rollback without deleting catalog seeds", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("No borrar automaticamente semillas de catalogo");
  });
});
