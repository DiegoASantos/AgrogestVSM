import { describe, expect, it } from "vitest";

import { PARCELA_PUNTO_REFERENCIA_INTERNO_MIGRATION } from "./042-parcela-punto-referencia-interno";

describe("042 parcela punto referencia interno", () => {
  const sql = PARCELA_PUNTO_REFERENCIA_INTERNO_MIGRATION.sql;

  it("agrega un Point 4326 nullable de forma idempotente", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS punto_referencia_parcela");
    expect(sql).toContain("geometry(Point, 4326)");
    expect(sql).not.toContain("NOT NULL");
  });

  it("documenta rollback compatible sin borrar geodatos", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("no se automatiza DROP COLUMN");
    expect(sql).not.toMatch(/^\s*DROP COLUMN/gmu);
  });
});
