import { describe, expect, it } from "vitest";

import { RECOMENDACIONES_REACTIVAS_PREVENTIVAS_MIGRATION } from "./049-recomendaciones-reactivas-preventivas";

describe("049 recomendaciones reactivas preventivas", () => {
  const sql = RECOMENDACIONES_REACTIVAS_PREVENTIVAS_MIGRATION.sql;

  it("adds compatible recommendation fields", () => {
    expect(sql).toContain("enfoque varchar(12) NOT NULL DEFAULT 'reactivo'");
    expect(sql).toContain("objetivo_id bigint");
    expect(sql).toContain("incidencia_grado smallint");
    expect(sql).toContain("severidad_grado smallint");
  });

  it("requires grade zero and a catalog target for preventive phytosanitary rows", () => {
    expect(sql).toContain("objetivo_id IS NOT NULL");
    expect(sql).toContain("incidencia_grado = 0");
    expect(sql).toContain("severidad_grado = 0");
    expect(sql).toContain("REFERENCES plagas_enfermedades(id)");
  });

  it("requires factor one for preventive fertilizer rows", () => {
    expect(sql).toContain("enfoque = 'reactivo' OR factor = 1");
  });

  it("documents a compatibility-safe rollback", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).not.toContain("DROP COLUMN");
  });
});
