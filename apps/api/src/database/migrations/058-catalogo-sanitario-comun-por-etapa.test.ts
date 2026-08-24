import { describe, expect, it } from "vitest";

import { CATALOGO_SANITARIO_COMUN_POR_ETAPA_MIGRATION } from "./058-catalogo-sanitario-comun-por-etapa";

describe("058 catálogo sanitario común por etapa", () => {
  const sql = CATALOGO_SANITARIO_COMUN_POR_ETAPA_MIGRATION.sql;

  it("valida el catálogo Mango y las relaciones base antes de actualizar", () => {
    expect(sql).toContain("mango_count <> 1");
    expect(sql).toContain("stage_count <> 8");
    expect(sql).toContain("target_pest_count <> 17");
    expect(sql).toContain("expected_relation_count := 17 * 8 * 8");
  });

  it("deja opcionales las combinaciones no listadas y reactiva las comunes", () => {
    expect(sql).toContain("SET activo = false");
    expect(sql).toContain("SET activo = true");
    expect(sql).toContain("('queresas', NULL)");
    expect(sql).toContain("('trips', 'floracion')");
    expect(sql).toContain("('trips', 'cuajado y amarre')");
    expect(sql).toContain("('alternaria', 'desarrollo del fruto')");
    expect(sql).toContain("('antracnosis', 'cosecha')");
  });

  it("documenta un rollback correctivo no destructivo", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).not.toContain("DELETE FROM plagas_enfermedades_etapas_niveles");
  });
});
