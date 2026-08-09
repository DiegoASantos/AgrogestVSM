import { describe, expect, it } from "vitest";

import { CATALOGO_SANITARIO_GLOBAL_MANGO_MIGRATION } from "./043-catalogo-sanitario-global-mango";

describe("043-catalogo-sanitario-global-mango", () => {
  const sql = CATALOGO_SANITARIO_GLOBAL_MANGO_MIGRATION.sql;

  it("limita la carga al catálogo activo y a etapas y labores activas de mango", () => {
    expect(sql).toContain("lower(btrim(cultivo.nombre)) = 'mango'");
    expect(sql).toContain("lower(btrim(etapa.tipo)) IN ('etapa', 'labor')");
    expect(sql).toContain(
      "lower(btrim(plaga_enfermedad.tipo)) IN ('plaga', 'enfermedad')"
    );
  });

  it("exige los cuatro grados de incidencia y severidad", () => {
    expect(sql).toContain("tipo IN ('incidencia', 'severidad')");
    expect(sql).toContain("grado BETWEEN 0 AND 3");
    expect(sql).toContain("canonical_level_count <> 8");
    expect(sql).toContain("HAVING count(*) <> 1");
  });

  it("aborta ante catálogos base incompletos o ambiguos", () => {
    expect(sql).toContain("mango_count <> 1");
    expect(sql).toContain("target_stage_count = 0");
    expect(sql).toContain("active_pest_count = 0 OR active_disease_count = 0");
    expect(sql).toContain("canonical_level_count <> 8");
  });

  it("es idempotente, reactiva relaciones y preserva sus descripciones", () => {
    expect(sql).toContain("ON CONFLICT (");
    expect(sql).toContain("SET activo = true");
    expect(sql).not.toContain("SET descripcion =");
  });

  it("comprueba la cardinalidad completa después de insertar", () => {
    expect(sql).toContain("* 8");
    expect(sql).toContain("actual_relation_count <> expected_relation_count");
    expect(sql).toContain("La carga sanitaria global quedó incompleta");
  });
});
