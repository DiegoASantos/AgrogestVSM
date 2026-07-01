import { describe, expect, it } from "vitest";

import { PRODUCTORES_ENTIDAD_MIGRATION } from "./023-productores-entidad";

describe("023-productores-entidad migration", () => {
  const sql = PRODUCTORES_ENTIDAD_MIGRATION.sql;

  it("adds entidad with persona as the compatible default", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS entidad");
    expect(sql).toContain("varchar(20) NOT NULL DEFAULT 'persona'");
  });

  it("relaxes document columns for non-person producers", () => {
    expect(sql).toContain("ALTER COLUMN tipo_documento_id DROP NOT NULL");
    expect(sql).toContain("ALTER COLUMN nro_documento DROP NOT NULL");
  });

  it("restricts entidad to the supported producer entity types", () => {
    expect(sql).toContain("chk_productores_entidad");
    expect(sql).toContain("CHECK (entidad IN ('persona', 'fundo', 'cooperativa'))");
  });

  it("documents the operational rollback path", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS chk_productores_entidad");
    expect(sql).toContain("ALTER COLUMN tipo_documento_id SET NOT NULL");
    expect(sql).toContain("ALTER COLUMN nro_documento SET NOT NULL");
  });

  it("has valid migration metadata", () => {
    expect(PRODUCTORES_ENTIDAD_MIGRATION.id).toBe("023-productores-entidad");
    expect(PRODUCTORES_ENTIDAD_MIGRATION.description.length).toBeGreaterThan(20);
  });
});
