import { describe, expect, it } from "vitest";

import { VISITA_RECETAS_MIGRATION } from "./019-visita-recetas";

describe("019-visita-recetas migration", () => {
  const sql = VISITA_RECETAS_MIGRATION.sql;

  it("creates all 7 catalog tables", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS coadyuvantes");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS ingredientes_activos");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS marcas_producto");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS modos_accion");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS tipos_control");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS tipos_producto_fitosanitario");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS fertilizantes");
  });

  it("creates all 6 receta tables", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_recetas");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_receta_fitosanidad");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_receta_fertilizacion");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_receta_riego");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_receta_labores");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visita_receta_historial");
  });

  it("seeds tipos_control with Quimico, Biologico, Mecanico", () => {
    expect(sql).toContain("('Quimico')");
    expect(sql).toContain("('Biologico')");
    expect(sql).toContain("('Mecanico')");
  });

  it("seeds tipos_producto_fitosanitario with 6 categories", () => {
    expect(sql).toContain("('Insecticida')");
    expect(sql).toContain("('Acaricida')");
    expect(sql).toContain("('Fungicida')");
    expect(sql).toContain("('Herbicida')");
    expect(sql).toContain("('Nematicida')");
    expect(sql).toContain("('Bactericida')");
  });

  it("seeds modos_accion with 4 modes", () => {
    expect(sql).toContain("('Sistemico')");
    expect(sql).toContain("('De contacto')");
    expect(sql).toContain("('Translaminar')");
    expect(sql).toContain("('Repelente')");
  });

  it("seeds 6 coadyuvantes", () => {
    expect(sql).toContain("('Corrector de pH'");
    expect(sql).toContain("('Adherente'");
    expect(sql).toContain("('Tensoactivo'");
    expect(sql).toContain("('Antideriva'");
    expect(sql).toContain("('Aceite penetrante'");
    expect(sql).toContain("('Antiespumante'");
  });

  it("adds proper indexes", () => {
    expect(sql).toContain("idx_visita_recetas_visita_id");
    expect(sql).toContain("idx_visita_receta_fitosanidad_receta_id");
    expect(sql).toContain("idx_visita_receta_fertilizacion_receta_id");
    expect(sql).toContain("idx_visita_receta_labores_receta_id");
    expect(sql).toContain("idx_visita_receta_historial_receta_id");
  });

  it("enforces visita_recetas uniqueness per visit", () => {
    expect(sql).toContain("CONSTRAINT visita_recetas_visita_id_key UNIQUE (visita_id)");
  });

  it("enforces visita_receta_riego uniqueness per receta", () => {
    expect(sql).toContain(
      "CONSTRAINT visita_receta_riego_receta_id_key UNIQUE (receta_id)"
    );
  });

  it("enforces visita_receta_labores uniqueness per receta+labors", () => {
    expect(sql).toContain(
      "CONSTRAINT visita_receta_labores_receta_labor_key UNIQUE (receta_id, labor)"
    );
  });

  it("cascades deletes from visita_recetas to fitosanidad", () => {
    expect(sql).toContain("CONSTRAINT visita_receta_fitosanidad_receta_id_fkey");
    expect(sql).toContain("ON DELETE CASCADE");
  });

  it("does not enforce optional fitosanidad catalog references", () => {
    expect(sql).not.toContain("visita_receta_fitosanidad_tipo_control_id_fkey");
    expect(sql).not.toContain("visita_receta_fitosanidad_tipo_producto_id_fkey");
    expect(sql).not.toContain("visita_receta_fitosanidad_modo_accion_id_fkey");
  });

  it("has valid migration metadata", () => {
    expect(VISITA_RECETAS_MIGRATION.id).toBe("019-visita-recetas");
    expect(VISITA_RECETAS_MIGRATION.description.length).toBeGreaterThan(20);
  });
});
