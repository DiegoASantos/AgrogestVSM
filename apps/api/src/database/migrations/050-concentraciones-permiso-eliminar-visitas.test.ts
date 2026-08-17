import { describe, expect, it } from "vitest";

import { CONCENTRACIONES_PERMISO_ELIMINAR_VISITAS_MIGRATION } from "./050-concentraciones-permiso-eliminar-visitas";

describe("050 concentraciones y permiso para eliminar visitas", () => {
  const sql = CONCENTRACIONES_PERMISO_ELIMINAR_VISITAS_MIGRATION.sql;

  it("amplia las dos concentraciones a 300 caracteres", () => {
    expect(sql).toContain("ALTER TABLE marcas_producto");
    expect(sql).toContain("ALTER TABLE fertilizantes");
    expect(sql.match(/TYPE varchar\(300\)/g)).toHaveLength(2);
  });

  it("agrega el permiso denegado por defecto", () => {
    expect(sql).toContain("puede_eliminar_visitas boolean NOT NULL DEFAULT false");
  });

  it("documenta un rollback compatible sin contraccion automatica", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).not.toContain("DROP COLUMN");
    expect(sql).not.toContain("TYPE varchar(30)");
  });
});
