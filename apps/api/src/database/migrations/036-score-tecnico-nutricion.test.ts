import { describe, expect, it } from "vitest";

import { SCORE_TECNICO_NUTRICION_MIGRATION } from "./036-score-tecnico-nutricion";

describe("036-score-tecnico-nutricion", () => {
  it("agrega códigos estables y la relación nutricional compatible", () => {
    const sql = SCORE_TECNICO_NUTRICION_MIGRATION.sql;

    expect(sql).toContain("ADD COLUMN IF NOT EXISTS codigo");
    expect(sql).toContain("'nitrogeno'");
    expect(sql).toContain("'magnesio'");
    expect(sql).toContain("'potasio'");
    expect(sql).toContain("'hierro'");
    expect(sql).toContain("'zinc'");
    expect(sql).toContain("'boro'");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS nutriente_id bigint");
    expect(sql).toContain("visita_evaluaciones_nutriente_id_fkey");
    expect(sql).toContain("visita_evaluaciones_nutricion_porcentaje_requerido_check");
    expect(sql).toContain("uq_visita_evaluaciones_visita_nutriente");
  });
});
