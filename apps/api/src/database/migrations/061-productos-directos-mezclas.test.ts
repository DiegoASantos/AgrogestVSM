import { describe, expect, it } from "vitest";

import { PRODUCTOS_DIRECTOS_MEZCLAS_MIGRATION } from "./061-productos-directos-mezclas";

describe("PRODUCTOS_DIRECTOS_MEZCLAS_MIGRATION", () => {
  it("adds compatible origin columns and conditional direct-product constraints", () => {
    const sql = PRODUCTOS_DIRECTOS_MEZCLAS_MIGRATION.sql;

    expect(PRODUCTOS_DIRECTOS_MEZCLAS_MIGRATION.id).toBe(
      "061-productos-directos-mezclas"
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS origen");
    expect(sql).toContain("ALTER COLUMN objetivo DROP NOT NULL");
    expect(sql).toContain("origen = 'mezcla_directa'");
    expect(sql).toContain("origen = 'recomendacion'");
  });
});
