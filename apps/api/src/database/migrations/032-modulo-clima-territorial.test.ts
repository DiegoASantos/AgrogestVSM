import { describe, expect, it } from "vitest";
import { MODULO_CLIMA_TERRITORIAL_MIGRATION } from "./032-modulo-clima-territorial";

describe("032 climate module migration", () => {
  it("creates isolated climate storage, initial points and operational sources", () => {
    expect(MODULO_CLIMA_TERRITORIAL_MIGRATION.id).toBe("032-modulo-clima-territorial");
    expect(MODULO_CLIMA_TERRITORIAL_MIGRATION.sql).toContain("CREATE SCHEMA IF NOT EXISTS clima");
    expect(MODULO_CLIMA_TERRITORIAL_MIGRATION.sql).toContain("clima.lecturas");
    expect(MODULO_CLIMA_TERRITORIAL_MIGRATION.sql).toContain("Tambogrande");
    expect(MODULO_CLIMA_TERRITORIAL_MIGRATION.sql).toContain("NASA POWER");
  });
});
