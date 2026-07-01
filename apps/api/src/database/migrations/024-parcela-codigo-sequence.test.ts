import { describe, expect, it } from "vitest";

import { PARCELA_CODIGO_SEQUENCE_MIGRATION } from "./024-parcela-codigo-sequence";

describe("024-parcela-codigo-sequence migration", () => {
  const sql = PARCELA_CODIGO_SEQUENCE_MIGRATION.sql;

  it("creates the parcel code sequence", () => {
    expect(sql).toContain("CREATE SEQUENCE IF NOT EXISTS parcelas_codigo_seq");
  });

  it("initializes the sequence from existing PAR codes", () => {
    expect(sql).toContain("setval");
    expect(sql).toContain("substring(codigo FROM '^PAR-([0-9]+)$')::bigint");
    expect(sql).toContain("WHERE codigo ~ '^PAR-[0-9]+$'");
  });

  it("sets the next value to one when no compatible codes exist", () => {
    expect(sql).toContain("COALESCE(MAX");
    expect(sql).toContain("+ 1");
    expect(sql).toContain("false");
  });

  it("documents the operational rollback path", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("DROP SEQUENCE IF EXISTS parcelas_codigo_seq");
  });

  it("has valid migration metadata", () => {
    expect(PARCELA_CODIGO_SEQUENCE_MIGRATION.id).toBe(
      "024-parcela-codigo-sequence"
    );
    expect(PARCELA_CODIGO_SEQUENCE_MIGRATION.description.length).toBeGreaterThan(20);
  });
});
