import { describe, expect, it } from "vitest";

import { ESTADO_PRODUCTOR_DERIVADO_PARCELAS_MIGRATION } from "./047-estado-productor-derivado-parcelas";

describe("ESTADO_PRODUCTOR_DERIVADO_PARCELAS_MIGRATION", () => {
  it("deriva el estado con parcelas activas y solo corrige inconsistencias", () => {
    expect(ESTADO_PRODUCTOR_DERIVADO_PARCELAS_MIGRATION.sql).toContain(
      "parcela.activo = TRUE"
    );
    expect(ESTADO_PRODUCTOR_DERIVADO_PARCELAS_MIGRATION.sql).toContain(
      "IS DISTINCT FROM EXISTS"
    );
    expect(ESTADO_PRODUCTOR_DERIVADO_PARCELAS_MIGRATION.sql).toContain(
      "Rollback operativo"
    );
    expect(ESTADO_PRODUCTOR_DERIVADO_PARCELAS_MIGRATION.sql).toContain(
      "creado_por_usuario_id"
    );
  });
});
