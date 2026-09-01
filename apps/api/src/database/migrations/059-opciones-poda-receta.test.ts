import { describe, expect, it } from "vitest";

import { OPCIONES_PODA_RECETA_MIGRATION } from "./059-opciones-poda-receta";

describe("059 opciones de poda en receta", () => {
  const sql = OPCIONES_PODA_RECETA_MIGRATION.sql;

  it("amplia el constraint sin modificar filas de recetas", () => {
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS visita_receta_labores_labor_check");
    expect(sql).toContain("ADD CONSTRAINT ck_visita_receta_labores_labor");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+visita_receta_labores/iu);
    expect(sql).not.toMatch(/UPDATE\s+visita_receta_labores/iu);
  });

  it("acepta las cuatro podas y conserva los valores historicos", () => {
    for (const value of [
      "limpieza_maleza_motoguadana",
      "poda_formacion",
      "poda_saneamiento",
      "poda_aclareo_iluminacion",
      "poda_rejuvenecimiento_severa"
    ]) {
      expect(sql).toContain(`'${value}'`);
    }
  });

  it("documenta un rollback compatible con datos offline", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("correccion hacia");
    expect(sql).toContain("adelante para preservar");
  });
});
