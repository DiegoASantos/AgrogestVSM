import { describe, expect, it } from "vitest";

import { DOSIS_COADYUVANTES_POR_MEZCLA_MIGRATION } from "./054-dosis-coadyuvantes-por-mezcla";

describe("054 dosis de coadyuvantes por mezcla", () => {
  const sql = DOSIS_COADYUVANTES_POR_MEZCLA_MIGRATION.sql;

  it("agrega una columna nullable sin reescribir recetas historicas", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS coadyuvantes_dosis text");
    expect(sql).not.toContain("SET NOT NULL");
    expect(sql).not.toContain("UPDATE visita_receta_mezclas");
  });
});
