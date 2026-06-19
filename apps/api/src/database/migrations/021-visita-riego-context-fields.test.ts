import { describe, expect, it } from "vitest";

import { VISITA_RIEGO_CONTEXT_FIELDS_MIGRATION } from "./021-visita-riego-context-fields";

describe("021-visita-riego-context-fields migration", () => {
  const sql = VISITA_RIEGO_CONTEXT_FIELDS_MIGRATION.sql;

  it("adds irrigation context columns used by the API entity", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS fuente_agua varchar(20)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS tipo_suelo varchar(20)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS humedad_suelo varchar(25)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS estres_hidrico boolean");
  });

  it("has valid migration metadata", () => {
    expect(VISITA_RIEGO_CONTEXT_FIELDS_MIGRATION.id).toBe(
      "021-visita-riego-context-fields"
    );
    expect(VISITA_RIEGO_CONTEXT_FIELDS_MIGRATION.description.length).toBeGreaterThan(20);
  });
});
