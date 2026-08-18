import { describe, expect, it } from "vitest";

import {
  ACTIVE_INGREDIENT_ALIASES,
  AGROCHEMICAL_CATALOG_ROWS,
  CATALOGO_AGROQUIMICOS_EXCEL_MIGRATION
} from "./051-catalogo-agroquimicos-excel";

const sql = CATALOGO_AGROQUIMICOS_EXCEL_MIGRATION.sql;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es-PE").replace(/\s+/gu, " ");
}

describe("051-catalogo-agroquimicos-excel", () => {
  it("conserva las 91 combinaciones unicas de nombre y tipo del Excel", () => {
    const productKeys = AGROCHEMICAL_CATALOG_ROWS.map(
      ([productType, , commercialName]) =>
        `${normalize(commercialName)}|${normalize(productType)}`
    );

    expect(AGROCHEMICAL_CATALOG_ROWS).toHaveLength(91);
    expect(new Set(productKeys).size).toBe(91);
  });

  it.each([
    ["CROPS-CANELA", ["Acaricida", "Insecticida"]],
    ["GOLDEN NATUR´L OIL", ["Acaricida", "Insecticida"]],
    ["K'NELAZO-AG", ["Acaricida", "Insecticida"]],
    ["NIMBIOL 0.1% CE", ["Fungicida", "Insecticida"]],
    ["TRICOX", ["Fungicida", "Nematicida"]]
  ])("mantiene los usos multiples de %s", (commercialName, expectedTypes) => {
    const productTypes = AGROCHEMICAL_CATALOG_ROWS.filter(
      ([, , candidateName]) => candidateName === commercialName
    )
      .map(([productType]) => productType)
      .sort();

    expect(productTypes).toEqual([...expectedTypes].sort());
  });

  it("reutiliza aliases quimicamente equivalentes", () => {
    expect(ACTIVE_INGREDIENT_ALIASES).toContainEqual([
      "Azoxystrobin + Difenoconazole",
      "AZOXYSTROBIN, DIFENOCONAZOLE"
    ]);
    expect(ACTIVE_INGREDIENT_ALIASES).toContainEqual([
      "Azoxystrobin + Tebuconazole",
      "TEBUCONAZOLE + AZOXYSTROBIN"
    ]);
    expect(ACTIVE_INGREDIENT_ALIASES).toContainEqual(["Glifosato", "GLYPHOSATE"]);
    expect(ACTIVE_INGREDIENT_ALIASES).toContainEqual([
      "Sulfato de cobre pentahidratado",
      "COPPER SULPHATE PENTAHYDRATE"
    ]);
    const canonicalNamesByNormalizedName = new Map<string, Set<string>>();
    for (const [canonicalName] of ACTIVE_INGREDIENT_ALIASES) {
      const normalizedName = normalize(canonicalName);
      const names = canonicalNamesByNormalizedName.get(normalizedName) ?? new Set();
      names.add(canonicalName);
      canonicalNamesByNormalizedName.set(normalizedName, names);
    }

    expect(
      [...canonicalNamesByNormalizedName.values()].every(
        (canonicalNames) => canonicalNames.size === 1
      )
    ).toBe(true);
    expect(canonicalNamesByNormalizedName.size).toBe(45);
  });

  it("compara la base actual por nombre comercial y tipo normalizados", () => {
    expect(sql).toContain("INSERT INTO ingredientes_activos");
    expect(sql).toContain("INSERT INTO marcas_producto");
    expect(sql).toContain("regexp_replace(lower(trim(existente.nombre))");
    expect(sql).toContain("AND existente.tipo_producto_id = catalogo.tipo_producto_id");
    expect(sql.match(/FROM tipos_producto_fitosanitario existente/gu)).toHaveLength(4);
    expect(sql.match(/ORDER BY existente.id/gu)).toHaveLength(3);
    expect(sql).toContain("WHERE NOT EXISTS");
  });

  it("solo completa campos vacios y no adivina el tipo de marcas multiuso", () => {
    expect(sql).toContain("nombres_de_tipo_unico");
    expect(sql).toContain("HAVING count(DISTINCT regexp_replace");
    expect(sql).toContain("marca.tipo_producto_id IS NULL");
    expect(sql).toContain(
      "ingrediente_activo_id = COALESCE(\n        marca.ingrediente_activo_id"
    );
    expect(sql).toContain(
      "concentracion = COALESCE(marca.concentracion, catalogo.concentracion)"
    );
    expect(sql).not.toMatch(/SET\s+activo\s*=/u);
  });

  it("preserva concentraciones compuestas y separa unidades simples", () => {
    expect(sql).toContain(
      "'CONFIEE 325 SC', 'Azoxystrobin 200 g/L + difenoconazole 125 g/L', NULL"
    );
    expect(sql).toContain("'BIO-SPLENT 70 WP', '70', 'g/kg'");
    expect(sql).toContain("'TRICHOMAX', '1×10¹² conidias viables/kg', NULL");
  });

  it("escapa apostrofes y documenta rollback sin borrados de catalogo", () => {
    expect(sql).toContain("K''NELAZO-AG");
    expect(sql).toContain("PAL''GUSANO-AG");
    expect(sql).toContain("Rollback operativo");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+(marcas_producto|ingredientes_activos)/iu);
  });
});
