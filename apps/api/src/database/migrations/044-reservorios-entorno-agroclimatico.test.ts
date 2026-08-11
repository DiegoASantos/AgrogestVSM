import { describe, expect, it } from "vitest";

import { RESERVORIOS_ENTORNO_AGROCLIMATICO_MIGRATION } from "./044-reservorios-entorno-agroclimatico";

describe("044 reservorios entorno agroclimatico", () => {
  const sql = RESERVORIOS_ENTORNO_AGROCLIMATICO_MIGRATION.sql;

  it("crea las tablas con claves primarias duales", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS clima.reservorios");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS clima.lecturas_reservorios");
    expect(sql).toContain("CONSTRAINT pk_clima_reservorios PRIMARY KEY (id)");
    expect(sql).toContain("CONSTRAINT pk_clima_lecturas_reservorios PRIMARY KEY (id)");
    expect(sql).toContain("uq_clima_reservorios_public_id UNIQUE (public_id)");
    expect(sql).toContain("uq_clima_lecturas_reservorios_public_id UNIQUE (public_id)");
  });

  it("declara las tres claves foraneas con su politica de borrado", () => {
    expect(sql).toMatch(
      /FOREIGN KEY \(reservorio_id\)\s+REFERENCES clima\.reservorios\(id\)\s+ON DELETE RESTRICT/u
    );
    expect(sql).toMatch(
      /FOREIGN KEY \(fuente_id\)\s+REFERENCES clima\.fuentes_datos\(id\)\s+ON DELETE SET NULL/u
    );
    expect(sql).toMatch(
      /FOREIGN KEY \(creado_por\)\s+REFERENCES usuarios\(public_id\)\s+ON DELETE SET NULL/u
    );
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_public_id");
  });

  it("restringe los dominios y carga semillas idempotentes", () => {
    expect(sql).toContain("ck_clima_reservorios_latitud");
    expect(sql).toContain("ck_clima_reservorios_capacidad");
    expect(sql).toContain("ck_clima_lecturas_variable");
    expect(sql).toContain("ck_clima_lecturas_tipo");
    expect(sql).toContain("'manual_reservorios'");
    expect(sql).toContain("'Poechos'");
    expect(sql).toContain("'San Lorenzo'");
    expect(sql).toContain(
      "ON CONFLICT (nombre, departamento, provincia, distrito) DO UPDATE"
    );
  });

  it("documenta un rollback que preserva auditoria", () => {
    expect(sql).toContain("Rollback operativo");
    expect(sql).toContain("backup");
    expect(sql).not.toMatch(/^\s*DROP TABLE/gmu);
  });
});
