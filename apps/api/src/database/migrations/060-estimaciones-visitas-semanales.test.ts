import { describe, expect, it } from "vitest";

import { ESTIMACIONES_VISITAS_SEMANALES_MIGRATION } from "./060-estimaciones-visitas-semanales";

describe("060 estimaciones semanales de visitas", () => {
  const sql = ESTIMACIONES_VISITAS_SEMANALES_MIGRATION.sql;

  it("crea una tabla aditiva con identidad, auditoria y baja logica", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS estimaciones_visitas");
    expect(sql).toContain("public_id uuid NOT NULL");
    expect(sql).toContain("creado_por_usuario_id bigint NOT NULL");
    expect(sql).toContain("actualizado_por_usuario_id bigint NOT NULL");
    expect(sql).toContain("activo boolean NOT NULL DEFAULT true");
    expect(sql).not.toMatch(/(?:DELETE|UPDATE)\s+(?:FROM\s+)?visitas_campo/iu);
  });

  it("protege la unicidad, cantidad y rango lunes-domingo", () => {
    expect(sql).toContain("UNIQUE (agronomo_usuario_id, fecha_inicio)");
    expect(sql).toContain("CHECK (visitas_estimadas >= 0)");
    expect(sql).toContain("EXTRACT(ISODOW FROM fecha_inicio) = 1");
    expect(sql).toContain("CHECK (fecha_fin = fecha_inicio + 6)");
  });

  it("agrega indices de consulta y documenta rollback conservador", () => {
    expect(sql).toContain("idx_estimaciones_visitas_semana_activa");
    expect(sql).toContain("idx_visitas_campo_agronomo_fecha_activa");
    expect(sql).toContain("Rollback operativo preferido");
    expect(sql).toContain("respaldo y autorizacion explicita");
  });
});
