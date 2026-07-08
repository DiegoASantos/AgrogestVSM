import { describe, expect, it } from "vitest";

import { COST_BUILD_PUBLIC_IDS_MIGRATION } from "./029-cost-build-public-ids";

const sql = COST_BUILD_PUBLIC_IDS_MIGRATION.sql;

describe("029-cost-build-public-ids migration", () => {
  it("adds public ids to the catalogs exported to Cost-Build", () => {
    for (const table of ["cultivos", "variedades", "campanias", "sectores"]) {
      expect(sql).toContain(`ALTER TABLE ${table}`);
      expect(sql).toContain("ADD COLUMN IF NOT EXISTS public_id uuid");
      expect(sql).toContain(`UPDATE ${table}`);
      expect(sql).toContain(`${table}_public_id_key`);
    }
  });

  it("uses generated UUID defaults and documents rollback", () => {
    expect(sql).toContain("SET public_id = gen_random_uuid()");
    expect(sql).toContain("ALTER COLUMN public_id SET DEFAULT gen_random_uuid()");
    expect(sql).toContain("Rollback operativo");
    expect(COST_BUILD_PUBLIC_IDS_MIGRATION.id).toBe("029-cost-build-public-ids");
  });
});
