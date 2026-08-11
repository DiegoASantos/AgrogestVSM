import { describe, expect, it } from "vitest";

import { INTEGRACION_DIARIA_WEATHERLINK_MIGRATION } from "./045-integracion-diaria-weatherlink";

describe("045-integracion-diaria-weatherlink", () => {
  it("creates an auditable state table with primary, unique and foreign keys", () => {
    const sql = INTEGRACION_DIARIA_WEATHERLINK_MIGRATION.sql;

    expect(sql).toContain(
      "CREATE TABLE IF NOT EXISTS clima.estaciones_estado_sincronizacion"
    );
    expect(sql).toContain("PRIMARY KEY (id)");
    expect(sql).toContain("UNIQUE (public_id)");
    expect(sql).toContain("UNIQUE (fuente_id, estacion_id)");
    expect(sql).toMatch(
      /FOREIGN KEY \(fuente_id\)[\s\S]+REFERENCES clima\.fuentes_datos\(id\)/u
    );
    expect(sql).toMatch(
      /FOREIGN KEY \(estacion_id\)[\s\S]+REFERENCES clima\.estaciones_meteorologicas\(id\)/u
    );
  });

  it("seeds WeatherLink without embedding credentials", () => {
    const sql = INTEGRACION_DIARIA_WEATHERLINK_MIGRATION.sql;

    expect(sql).toContain("'weatherlink', 'WeatherLink Davis'");
    expect(sql).not.toContain("X-Api-Secret");
    expect(sql).not.toContain("api-key=");
  });
});
