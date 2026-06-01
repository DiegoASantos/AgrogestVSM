import { describe, expect, it } from "vitest";

import { TERRITORIAL_SECTORS_AND_PIURA_GEOGRAPHY_MIGRATION } from "./001-territorial-sectors-and-piura-geography";

describe("territorial sectors migration", () => {
  const sql = TERRITORIAL_SECTORS_AND_PIURA_GEOGRAPHY_MIGRATION.sql;

  it("removes disposable visit data before rebuilding parcelas and sectores", () => {
    expect(sql.indexOf("DELETE FROM visitas_campo")).toBeLessThan(
      sql.indexOf("DELETE FROM parcelas")
    );
    expect(sql.indexOf("DELETE FROM parcelas")).toBeLessThan(
      sql.indexOf("DELETE FROM sectores")
    );
  });

  it("seeds the eight provinces and sixty-five districts of Piura", () => {
    expect(sql.match(/\('20\d{2}', '[^']+'\)/gu)).toHaveLength(8);
    expect(sql.match(/\('20\d{2}', '20\d{4}', '[^']+'\)/gu)).toHaveLength(65);
  });

  it("moves ownership from sector to parcela", () => {
    expect(sql).toContain("sectores DROP COLUMN IF EXISTS productor_id");
    expect(sql).toContain("sectores ADD COLUMN IF NOT EXISTS distrito_id");
    expect(sql).toContain("parcelas ADD COLUMN IF NOT EXISTS productor_id");
  });
});
