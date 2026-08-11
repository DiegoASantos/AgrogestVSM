import { describe, expect, it } from "vitest";

import { ESTACIONES_WEATHERLINK_COORDENADAS_OPCIONALES_MIGRATION } from "./046-estaciones-weatherlink-coordenadas-opcionales";

describe("046-estaciones-weatherlink-coordenadas-opcionales", () => {
  it("makes both coordinates optional without removing their range checks", () => {
    const sql = ESTACIONES_WEATHERLINK_COORDENADAS_OPCIONALES_MIGRATION.sql;

    expect(sql).toContain("ALTER COLUMN latitud DROP NOT NULL");
    expect(sql).toContain("ALTER COLUMN longitud DROP NOT NULL");
    expect(sql).not.toContain("DROP CONSTRAINT");
    expect(sql).not.toContain("DROP TABLE");
  });
});
