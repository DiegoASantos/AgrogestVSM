import { describe, expect, it } from "vitest";
import { ALERTAS_VISITAS_PRODUCTOR_DIA_MIGRATION } from "./075-alertas-visitas-productor-dia";

describe("migration 075", () => {
  it("keeps a read per user, producer and date while preserving legacy reads", () => {
    const sql = ALERTAS_VISITAS_PRODUCTOR_DIA_MIGRATION.sql;
    expect(sql).toContain("PRIMARY KEY (usuario_id, productor_id, fecha_visita)");
    expect(sql).toContain("FROM notificaciones_visitas_leidas anterior");
    expect(sql).toContain("AND otra.agronomo_usuario_id = visita.agronomo_usuario_id");
    expect(sql).not.toContain("DROP TABLE");
  });
});
