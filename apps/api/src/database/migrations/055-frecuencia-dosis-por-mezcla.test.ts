import { describe, expect, it } from "vitest";

import { FRECUENCIA_DOSIS_POR_MEZCLA_MIGRATION } from "./055-frecuencia-dosis-por-mezcla";

describe("055 frecuencia de dosis por mezcla", () => {
  const sql = FRECUENCIA_DOSIS_POR_MEZCLA_MIGRATION.sql;

  it("agrega una columna nullable sin reescribir recetas historicas", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS frecuencia_dosis text");
    expect(sql).not.toContain("SET NOT NULL");
    expect(sql).not.toContain("UPDATE visita_receta_mezclas");
  });
});
