import { describe, expect, it } from "vitest";
import { UNIDADES_DOSIS_RECETA_MIGRATION } from "./048-unidades-dosis-receta";

describe("048 unidades dosis receta", () => {
  const sql = UNIDADES_DOSIS_RECETA_MIGRATION.sql;

  it("adds a nullable fitosanitary dose unit with canonical values", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS unidad_dosis varchar(30)");
    for (const unit of ["mg", "g", "kg", "ml", "l"]) {
      expect(sql).toContain(`'${unit}/cilindro'`);
    }
  });

  it("documents a compatibility-safe rollback", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).not.toContain("DROP COLUMN unidad_dosis");
  });
});
