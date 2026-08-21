import { describe, expect, it } from "vitest";

import { DEFICIENCIAS_CALCIO_FOSFORO_MIGRATION } from "./056-deficiencias-calcio-fosforo";

describe("056 deficiencias de Calcio y Fósforo", () => {
  const sql = DEFICIENCIAS_CALCIO_FOSFORO_MIGRATION.sql;

  it("limita la carga al cultivo Mango y usa códigos estables", () => {
    expect(sql).toContain("lower(btrim(codigo)) = 'mango'");
    expect(sql).toContain("('calcio'::varchar, 'Calcio'::varchar)");
    expect(sql).toContain("('fosforo'::varchar, 'Fósforo'::varchar)");
  });

  it("aborta si Mango, Nitrógeno o sus severidades no son válidos", () => {
    expect(sql).toContain("mango_count <> 1");
    expect(sql).toContain("nitrogeno_count <> 1");
    expect(sql).toContain("template_detail_count = 0");
    expect(sql).toContain("target_match_count > 1");
  });

  it("copia y reactiva los detalles de Nitrógeno de forma idempotente", () => {
    expect(sql).toContain(
      "ON CONFLICT ON CONSTRAINT detalle_nutrientes_nutriente_nombre_key"
    );
    expect(sql).toContain("descripcion = EXCLUDED.descripcion");
    expect(sql).toContain("activo = true");
  });

  it("verifica ambos nutrientes y la cardinalidad de severidades", () => {
    expect(sql).toContain("target_count <> 2");
    expect(sql).toContain("incomplete_target_count <> 0");
    expect(sql).toContain("La carga de Calcio y Fósforo quedó incompleta");
  });

  it("documenta un rollback no destructivo", () => {
    expect(sql).toContain("no eliminar nutrientes ni severidades");
    expect(sql).not.toContain("DELETE FROM nutrientes");
    expect(sql).not.toContain("DELETE FROM detalle_nutrientes");
  });
});
