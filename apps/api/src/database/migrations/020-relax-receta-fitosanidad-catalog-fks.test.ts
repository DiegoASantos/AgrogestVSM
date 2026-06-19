import { describe, expect, it } from "vitest";

import { RELAX_RECETA_FITOSANIDAD_CATALOG_FKS_MIGRATION } from "./020-relax-receta-fitosanidad-catalog-fks";

describe("020-relax-receta-fitosanidad-catalog-fks migration", () => {
  const sql = RELAX_RECETA_FITOSANIDAD_CATALOG_FKS_MIGRATION.sql;

  it("drops optional catalog foreign keys without touching receta cascade", () => {
    expect(sql).toContain(
      "DROP CONSTRAINT IF EXISTS visita_receta_fitosanidad_tipo_control_id_fkey"
    );
    expect(sql).toContain(
      "DROP CONSTRAINT IF EXISTS visita_receta_fitosanidad_tipo_producto_id_fkey"
    );
    expect(sql).toContain(
      "DROP CONSTRAINT IF EXISTS visita_receta_fitosanidad_modo_accion_id_fkey"
    );
    expect(sql).not.toContain("visita_receta_fitosanidad_receta_id_fkey");
  });

  it("has valid migration metadata", () => {
    expect(RELAX_RECETA_FITOSANIDAD_CATALOG_FKS_MIGRATION.id).toBe(
      "020-relax-receta-fitosanidad-catalog-fks"
    );
    expect(
      RELAX_RECETA_FITOSANIDAD_CATALOG_FKS_MIGRATION.description.length
    ).toBeGreaterThan(20);
  });
});
