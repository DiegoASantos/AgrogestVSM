import { describe, expect, it } from "vitest";
import { VISITAS_COMERCIALES_MIGRATION } from "./073-visitas-comerciales";

describe("migration 073", () => {
  it("creates independent commercial visits with optional point and stable public identity", () => {
    const sql = VISITAS_COMERCIALES_MIGRATION.sql;
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visitas_comerciales");
    expect(sql).toContain("public_id uuid NOT NULL");
    expect(sql).toContain("agronomo_usuario_id bigint NOT NULL REFERENCES usuarios(id)");
    expect(sql).toContain("ubicacion_visita geometry(Point, 4326)");
    expect(sql).not.toMatch(/productor_id|parcela_id/);
    expect(sql).toContain("chk_visita_comercial_apellidos");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_visitas_comerciales_fecha");
  });
});
