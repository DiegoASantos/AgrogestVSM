import { describe, expect, it } from "vitest";

import { NOTIFICACIONES_OPERATIVAS_VISITAS_MIGRATION } from "./068-notificaciones-operativas-visitas";

describe("migration 068", () => {
  it("stores reads per user and notice identity without altering visits", () => {
    const sql = NOTIFICACIONES_OPERATIVAS_VISITAS_MIGRATION.sql;
    expect(sql).toContain("PRIMARY KEY (usuario_id, productor_id, agronomo_usuario_id, fecha_visita)");
    expect(sql).toContain("WHERE activo = true");
  });
});
