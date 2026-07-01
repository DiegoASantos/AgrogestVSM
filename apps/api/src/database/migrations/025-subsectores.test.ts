import { describe, expect, it } from "vitest";

import { SUBSECTORES_MIGRATION } from "./025-subsectores";

describe("subsectores migration", () => {
  const sql = SUBSECTORES_MIGRATION.sql;

  it("creates subsectores before moving parcelas to subsector_id", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS subsectores");
    expect(sql.indexOf("CREATE TABLE IF NOT EXISTS subsectores")).toBeLessThan(
      sql.indexOf("ADD COLUMN IF NOT EXISTS subsector_id")
    );
    expect(sql).toContain("DROP COLUMN IF EXISTS sector_id");
    expect(sql).toContain("FOREIGN KEY (subsector_id) REFERENCES subsectores(id)");
  });

  it("clears dependent visits before deleting parcelas rows", () => {
    expect(sql.indexOf("'visitas_campo'")).toBeLessThan(
      sql.indexOf("DELETE FROM parcelas")
    );
  });

  it("drops disposable parcela and subsector data before adding the new FK", () => {
    expect(sql.indexOf("DELETE FROM parcelas")).toBeLessThan(
      sql.indexOf("DELETE FROM subsectores")
    );
    expect(sql.indexOf("DELETE FROM subsectores")).toBeLessThan(
      sql.indexOf("ADD CONSTRAINT parcelas_subsector_id_fkey")
    );
  });

  it("keeps the global PAR code sequence untouched", () => {
    expect(sql).not.toContain("DROP SEQUENCE");
    expect(sql).toContain("Mantener parcelas_codigo_seq");
  });
});
