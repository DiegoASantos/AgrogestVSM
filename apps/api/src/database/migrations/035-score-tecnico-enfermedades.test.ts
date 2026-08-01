import { describe, expect, it } from "vitest";

import { SCORE_TECNICO_ENFERMEDADES_MIGRATION } from "./035-score-tecnico-enfermedades";

describe("035-score-tecnico-enfermedades", () => {
  it("asigna codigos estables a las cuatro enfermedades del macro-score", () => {
    expect(SCORE_TECNICO_ENFERMEDADES_MIGRATION.sql).toContain("'oidium'");
    expect(SCORE_TECNICO_ENFERMEDADES_MIGRATION.sql).toContain("'antracnosis'");
    expect(SCORE_TECNICO_ENFERMEDADES_MIGRATION.sql).toContain("'muerte_regresiva'");
    expect(SCORE_TECNICO_ENFERMEDADES_MIGRATION.sql).toContain("'alternaria'");
    expect(SCORE_TECNICO_ENFERMEDADES_MIGRATION.sql).toContain(
      "lower(trim(tipo)) = 'enfermedad'"
    );
    expect(SCORE_TECNICO_ENFERMEDADES_MIGRATION.sql).toContain("IF catalog_count <> 1");
  });
});
