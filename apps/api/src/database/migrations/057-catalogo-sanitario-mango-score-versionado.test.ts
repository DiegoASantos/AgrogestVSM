import { describe, expect, it } from "vitest";

import { CATALOGO_SANITARIO_MANGO_SCORE_VERSIONADO_MIGRATION } from "./057-catalogo-sanitario-mango-score-versionado";

describe("057 catálogo sanitario Mango y versión de score", () => {
  const sql = CATALOGO_SANITARIO_MANGO_SCORE_VERSIONADO_MIGRATION.sql;

  it("preserva el score histórico con la versión 1 y asigna 2 a nuevas visitas", () => {
    expect(sql).toContain("SET version_score_tecnico = 1");
    expect(sql).toContain("ALTER COLUMN version_score_tecnico SET DEFAULT 2");
    expect(sql).toContain("CHECK (version_score_tecnico IN (1, 2))");
  });

  it("carga las siete fichas con códigos canónicos y todas las etapas Mango", () => {
    for (const code of [
      "aranita_roja",
      "mosca_blanca",
      "gusano_barrenador",
      "hormiga_arriera",
      "fusariosis",
      "botritis",
      "fumagina"
    ]) {
      expect(sql).toContain(`'${code}'`);
    }
    expect(sql).toContain("lower(btrim(cultivo.codigo)) = 'mng'");
    expect(sql).toContain("nivel.grado BETWEEN 0 AND 3");
    expect(sql).toContain(
      "ON CONFLICT (plaga_enfermedad_id, etapa_fenologica_id, nivel_incidencia_severidad_id)"
    );
  });

  it("protege contra ambigüedad y documenta un rollback no destructivo", () => {
    expect(sql).toContain("IF matches > 1 THEN");
    expect(sql).toContain("Rollback operativo");
    expect(sql).not.toContain("DELETE FROM plagas_enfermedades");
  });
});
