import { describe, expect, it } from "vitest";

import { buildConcentracionesUnidadesRecetaSql } from "./037-concentraciones-unidades-receta";
import { REPARAR_CONCENTRACIONES_UNIDADES_RECETA_MIGRATION } from "./038-reparar-concentraciones-unidades-receta";

describe("038-reparar-concentraciones-unidades-receta", () => {
  it("reuses only the corrected catalog DML instead of repeating schema changes", () => {
    expect(REPARAR_CONCENTRACIONES_UNIDADES_RECETA_MIGRATION.sql).toBe(
      buildConcentracionesUnidadesRecetaSql(false)
    );
    expect(REPARAR_CONCENTRACIONES_UNIDADES_RECETA_MIGRATION.sql).toContain(
      "CREATE TEMP TABLE catalogo_marcas_037"
    );
    expect(REPARAR_CONCENTRACIONES_UNIDADES_RECETA_MIGRATION.sql).toContain(
      "CREATE TEMP TABLE catalogo_fertilizantes_037"
    );
    expect(REPARAR_CONCENTRACIONES_UNIDADES_RECETA_MIGRATION.sql).not.toContain(
      "ALTER TABLE"
    );
    expect(REPARAR_CONCENTRACIONES_UNIDADES_RECETA_MIGRATION.id).toBe(
      "038-reparar-concentraciones-unidades-receta"
    );
  });
});
