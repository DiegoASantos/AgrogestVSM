import { describe, expect, it } from "vitest";

import { VISITA_CALIFICACIONES_MIGRATION } from "./026-visita-calificaciones";

const sql = VISITA_CALIFICACIONES_MIGRATION.sql;

describe("026-visita-calificaciones migration", () => {
  it("creates visita_calificaciones with visit and public ids", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_calificaciones");
    expect(sql).toContain("public_id uuid NOT NULL DEFAULT gen_random_uuid()");
    expect(sql).toContain("visita_id bigint NOT NULL");
  });

  it("enforces module and score constraints", () => {
    expect(sql).toContain("chk_visita_calificaciones_modulo");
    expect(sql).toContain("'plagas', 'enfermedades', 'nutricion', 'riego', 'labores'");
    expect(sql).toContain("chk_visita_calificaciones_puntaje");
    expect(sql).toContain("puntaje >= 0 AND puntaje <= 3");
  });

  it("enforces idempotent upsert key", () => {
    expect(sql).toContain("uq_visita_calificaciones_visita_modulo");
    expect(sql).toContain("UNIQUE (visita_id, modulo)");
  });

  it("documents rollback", () => {
    expect(VISITA_CALIFICACIONES_MIGRATION.id).toBe("026-visita-calificaciones");
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("DROP TABLE IF EXISTS visita_calificaciones CASCADE");
  });
});
