import { describe, expect, it } from "vitest";

import { VISITA_CALIFICACIONES_JUSTIFICACION_MIGRATION } from "./027-visita-calificaciones-justificacion";

const sql = VISITA_CALIFICACIONES_JUSTIFICACION_MIGRATION.sql;

describe("027-visita-calificaciones-justificacion migration", () => {
  it("adds nullable justification columns to visita_calificaciones", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS justificado boolean");
    expect(sql).toContain(
      "ADD COLUMN IF NOT EXISTS categoria_justificacion varchar(100)"
    );
    expect(sql).toContain(
      "ADD COLUMN IF NOT EXISTS motivo_justificacion varchar(200)"
    );
  });

  it("allows step notes for step 6", () => {
    expect(sql).toContain("DROP CONSTRAINT visita_paso_observaciones_paso_check");
    expect(sql).toContain("CHECK (paso BETWEEN 1 AND 6)");
  });
});
