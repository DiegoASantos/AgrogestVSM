import { describe, expect, it } from "vitest";

import { CULTIVO_CODE_REQUIRED_MIGRATION } from "./022-cultivo-code-required";

describe("022-cultivo-code-required migration", () => {
  const sql = CULTIVO_CODE_REQUIRED_MIGRATION.sql;

  it("trims existing crop codes before enforcing constraints", () => {
    expect(sql).toContain("SET codigo = btrim(codigo)");
  });

  it("aborts when existing crop codes are null or blank", () => {
    expect(sql).toContain("codigo IS NULL OR btrim(codigo) = ''");
    expect(sql).toContain("RAISE EXCEPTION");
  });

  it("requires codigo to be not null and not blank", () => {
    expect(sql).toContain("ALTER COLUMN codigo SET NOT NULL");
    expect(sql).toContain("cultivos_codigo_not_blank_check");
    expect(sql).toContain("CHECK (btrim(codigo) <> '')");
  });

  it("has valid migration metadata", () => {
    expect(CULTIVO_CODE_REQUIRED_MIGRATION.id).toBe("022-cultivo-code-required");
    expect(CULTIVO_CODE_REQUIRED_MIGRATION.description.length).toBeGreaterThan(20);
  });
});
