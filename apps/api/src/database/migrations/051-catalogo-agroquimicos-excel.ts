import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export type AgrochemicalCatalogRow = readonly [
  productType: string,
  activeIngredient: string,
  commercialName: string,
  sourceConcentration: string
];

export const AGROCHEMICAL_CATALOG_ROWS: readonly AgrochemicalCatalogRow[] = [
  ["Fungicida", "BACILLUS SUBTILIS", "BIO-SPLENT 70 WP", "70 g/kg"],
  ["Insecticida", "EXTRACTO DE KARANJA OIL", "BIOKARANYA", "600 g/L"],
  ["Fungicida", "DIFENOCONAZOLE", "BLINDER", "250 g/L"],
  ["Fungicida", "CARBENDAZIM", "BOTRIZIM 50 FW", "500 g/L"],
  ["Fungicida", "PROCHLORAZ", "BUCANER", "450 g/L"],
  ["Fungicida", "Prochloraz", "CADETE 45% EC", "450 g/L"],
  ["Acaricida", "SPIRODICLOFEN", "CHOQUE", "240 g/L"],
  ["Fungicida", "Prochloraz", "CHRONOS 45 EC", "450 g/L"],
  ["Insecticida", "Pyriproxyfen", "CHUNGAR", "100 g/L"],
  [
    "Fungicida",
    "Azoxystrobin + Difenoconazole",
    "CONFIEE 325 SC",
    "Azoxystrobin 200 g/L + difenoconazole 125 g/L"
  ],
  ["Fungicida", "AZUFRE", "COSAVET DF", "800 g/kg"],
  ["Fungicida", "FLUDIOXONIL", "COVERPLUS 230 SC", "230 g/L"],
  ["Acaricida", "ACEITE DE CANELA", "CROPS-CANELA", "200 g/L"],
  ["Insecticida", "ACEITE DE CANELA", "CROPS-CANELA", "200 g/L"],
  [
    "Fungicida",
    "AZOXYSTROBIN, TEBUCONAZOLE",
    "CUSTODIA 32 SC",
    "Azoxystrobin 120 g/L + tebuconazole 200 g/L"
  ],
  ["Herbicida", "GLYPHOSATE ISOPROPILAMINA", "DESTRUCTOR", "480 g/L"],
  ["Fungicida", "MANCOZEB", "DITHANE F-MB", "430 g/L"],
  ["Herbicida", "GLYPHOSATE", "EMBATE 480 SL", "480 g/L"],
  ["Insecticida", "SPINOSAD", "ENTRUST SC", "240 g/L"],
  [
    "Fungicida",
    "AZOXYSTROBIN, TEBUCONAZOLE",
    "EPICO 750 WG",
    "Azoxystrobin 250 g/kg + tebuconazole 500 g/kg"
  ],
  ["Insecticida", "PYRIPROXYFEN", "EPINGLE 10 EC", "100 g/L"],
  ["Herbicida", "GLYPHOSATE ISOPROPILAMINA", "ERRASER 757", "757 g/kg"],
  ["Fungicida", "DIFENOCONAZOLE", "ESCOLTA 250 EC", "250 g/L"],
  ["Insecticida", "FIPRONIL", "FAMOSS", "200 g/L"],
  ["Herbicida", "GLYPHOSATE", "FUEGO", "480 g/L"],
  ["Insecticida", "SPINOSAD", "GF-120", "0.24 g/L"],
  ["Insecticida", "ACETAMIPRID", "GLADIADOR PLUS 700 WG", "700 g/kg"],
  ["Herbicida", "GLYPHOSATE ISOPROPILAMINA", "GLITOX", "480 g/L"],
  ["Herbicida", "GLYPHOSATE ISOPROPILAMINA", "GLYPHOGAN 48 SL", "480 g/L"],
  ["Insecticida", "ACEITE DE SOYA", "GOLDEN NATUR´L OIL", "855.6 g/L"],
  ["Acaricida", "ACEITE DE SOYA", "GOLDEN NATUR´L OIL", "855.6 g/L"],
  ["Fungicida", "PYRACLOSTROBIN", "HEADLINE PRO", "250 g/L"],
  ["Insecticida", "ACEITE DE PALMA ACEITERA", "HRK", "900 g/L"],
  ["Insecticida", "ACETAMIPRID", "HURRICANE 70 WP", "700 g/kg"],
  ["Insecticida", "ACEITE MINERAL", "K-OIL MINERAL", "950 g/L"],
  ["Acaricida", "ACEITE DE CANELA", "K'NELAZO-AG", "200 g/L"],
  ["Insecticida", "ACEITE DE CANELA", "K'NELAZO-AG", "200 g/L"],
  ["Fungicida", "PENCONAZOLE", "KAPAZ", "100 g/L"],
  ["Fungicida", "KRESOXIM METHYL", "KREMEX 500 WG", "500 g/kg"],
  ["Fungicida", "AZUFRE", "KUMULUS DF", "800 g/kg"],
  ["Fungicida", "FLUDIOXONIL", "L-ESPECIALISTA 230 SC", "230 g/L"],
  ["Insecticida", "IMIDACLOPRID", "LANCER", "350 g/L"],
  ["Fungicida", "Sulfato de cobre pentahidratado", "MASTERCOP", "260 g/L"],
  ["Fungicida", "THIABENDAZOLE", "MERTECT 500 SC", "500 g/l"],
  ["Fungicida", "BUPIRIMATE", "MIRROW", "250 g/L"],
  [
    "Insecticida",
    "ACEITE DE CITRONELA, EXTRACTO DE CANELA",
    "MONSAI BIO",
    "Aceite de citronela 600 g/L + extracto de canela 250 g/L"
  ],
  [
    "Fungicida",
    "ACIDO LACTICO, EXTRACTO DE SACCHARUM OFFICINARUM",
    "MORILEC 360",
    "Ácido láctico 21.3 g/kg  + extracto de Saccharum officinarum 129 g/L"
  ],
  [
    "Fungicida",
    "TEBUCONAZOLE, TRIFLOXYSTROBIN",
    "NATIVO 75 WG",
    "Tebuconazole 500 g/kg + trifloxystrobin 250 g/kg"
  ],
  ["Fungicida", "Prochloraz", "NIAGARA 45 CE", "450 g/L"],
  [
    "Insecticida",
    "ACEITE DE NEEM, AZADIRACHTA",
    "NIMBIOL 0.1% CE",
    "Azadirachtina 0.10% + aceite de neem 99.90%"
  ],
  [
    "Fungicida",
    "ACEITE DE NEEM, AZADIRACHTA",
    "NIMBIOL 0.1% CE",
    "Azadirachtina 0.10% + aceite de neem 99.90%"
  ],
  ["Fungicida", "BUPIRIMATE", "NIMROD", "250 g/L"],
  ["Fungicida", "TETRAETHYL SILICATE", "OMEX SW7", "700 g/L"],
  ["Fungicida", "TEBUCONAZOLE", "ORIUS 25 EW", "250 g/L"],
  [
    "Insecticida",
    "BACILLUS THURINGIENSIS VAR. KURSTAKI, BACILLUS THURINGIENSIS VAR AIZAWAI",
    "PAL'GUSANO-AG",
    "B. thuringiensis var. kurstaki 114.2 g/L + B. thuringiensis var. aizawai 114.2 g/L"
  ],
  ["Fungicida", "AZUFRE", "PANTERA 720 SC", "720 g/L"],
  ["Fungicida", "AZUFRE", "PANTERA 80 WP", "800 g/kg"],
  ["Fungicida", "AZUFRE", "PANTERA MOJABLE", "930 g/kg"],
  ["Fungicida", "AZUFRE", "PANTERA PROCESADO", "930 g/kg"],
  ["Fungicida", "COPPER SULPHATE PENTAHYDRATE", "PHYTON 27", "247 g/L"],
  ["Fungicida", "CARBENDAZIM", "PROTEXIN 500 FW", "500 g/L"],
  ["Fungicida", "PROCHLORAZ", "PYRO 45 EC", "450 g/L"],
  ["Fungicida", "TEBUCONAZOLE", "REVENTON 250 EW", "250 g/L"],
  ["Herbicida", "GLYPHOSATE ISOPROPILAMINA", "SANFOSATO", "480 g/L"],
  ["Fungicida", "DIFENOCONAZOLE", "SCORE 250 EC", "250 g/L"],
  ["Fungicida", "THIABENDAZOLE", "SEÑAL 500 SC", "500 g/L"],
  ["Fungicida", "BACILLUS AMYLOLIQUEFACIENS", "SERENADE ASO", "13.68 g/L aprox."],
  ["Fungicida", "AZUFRE", "SOLFORTE 800 WG", "800 g/kg"],
  ["Insecticida", "SPINOSAD", "SPLINTER 120 SC", "120 g/L"],
  ["Fungicida", "PROCHLORAZ", "SPORTAK 45 CE", "450 g/L"],
  ["Insecticida", "MALATHION", "STARKIL 60 EC", "625 g/L"],
  ["Fungicida", "Kresoxim metil", "STROBY DF", "500 g/kg"],
  ["Fungicida", "AZOXYSTROBIN", "STRONSIL 50 WG", "500 g/kg"],
  ["Fungicida", "Azufre", "SULFA 80 PM", "800 g/kg"],
  ["Fungicida", "AZUFRE", "SULFA PLUS 800 WG", "800 g/kg"],
  ["Fungicida", "PROCHLORAZ", "SUPER -A 450 EC", "450 g/L"],
  ["Fungicida", "PROCHLORAZ", "SUPERAZ 45 EC", "450 g/L"],
  ["Fungicida", "TEBUCONAZOLE", "TEBUSAC 25 EW", "250 g/L"],
  ["Fungicida", "Tebuconazole", "TENAZ 250 EW", "250 g/L"],
  ["Fungicida", "AZOXYSTROBIN", "TOKE 50 WG", "500 g/kg"],
  ["Fungicida", "PENCONAZOLE", "TOPAS 100 EC", "100 g/L"],
  ["Fungicida", "TRICHODERMA VIRIDE", "TRICHOMAX", "1×10¹² conidias viables/kg"],
  [
    "Fungicida",
    "TRICHODERMA HARZIANUM, TRICHODERMA KONINGII",
    "TRICOX",
    "T. koningii 3×10⁷ conidios/g + T. harzianum 2×10⁷ conidios/g"
  ],
  [
    "Nematicida",
    "TRICHODERMA HARZIANUM, TRICHODERMA KONINGII",
    "TRICOX",
    "T. koningii 3×10⁷ conidios/g + T. harzianum 2×10⁷ conidios/g"
  ],
  ["Insecticida", "BUPROFEZIN", "TRIUNFO", "250 g/kg"],
  [
    "Fungicida",
    "AZOXYSTROBIN, DIFENOCONAZOLE",
    "TRONKAL",
    "Azoxystrobin 200 g/L + difenoconazole 125 g/L"
  ],
  ["Fungicida", "TRIADIMENOL", "VYDAN 250 EC", "250 g/L"],
  ["Acaricida", "ACEITE DE LIMON", "ZITRIK ÁCAROS", "800 g/L"],
  ["Herbicida", "GLUFOSINATE-AMMONIUM", "FASCINATE", "280 g/L"],
  [
    "Insecticida",
    "ACETAMIPRID, PYRIPROXYFEN",
    "ANTIPODA",
    "Acetamiprid 100 g/L + pyriproxyfen 100 g/L"
  ],
  ["Insecticida", "SPINOSAD", "SKYFALL 120 SC", "120 g/L"]
];

const CANONICAL_INGREDIENT_ALIASES = [
  [
    "Azoxystrobin + Difenoconazole",
    ["Azoxystrobin + Difenoconazole", "AZOXYSTROBIN, DIFENOCONAZOLE"]
  ],
  [
    "Azoxystrobin + Tebuconazole",
    ["AZOXYSTROBIN, TEBUCONAZOLE", "TEBUCONAZOLE + AZOXYSTROBIN"]
  ],
  ["Glifosato", ["Glifosato", "GLYPHOSATE"]],
  ["Glifosato isopropilamina", ["Glifosato isopropilamina", "GLYPHOSATE ISOPROPILAMINA"]],
  ["Kresoxim metil", ["Kresoxim metil", "KRESOXIM METHYL"]],
  [
    "Sulfato de cobre pentahidratado",
    ["Sulfato de cobre pentahidratado", "COPPER SULPHATE PENTAHYDRATE"]
  ]
] as const;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es-PE").replace(/\s+/gu, " ");
}

const SOURCE_INGREDIENT_NAMES_BY_NORMALIZED = new Map<string, string>();

for (const [, sourceName] of AGROCHEMICAL_CATALOG_ROWS) {
  const normalizedName = normalize(sourceName);
  if (!SOURCE_INGREDIENT_NAMES_BY_NORMALIZED.has(normalizedName)) {
    SOURCE_INGREDIENT_NAMES_BY_NORMALIZED.set(normalizedName, sourceName.trim());
  }
}

function resolveCanonicalIngredient(sourceName: string): string {
  const normalizedSource = normalize(sourceName);

  for (const [canonicalName, aliases] of CANONICAL_INGREDIENT_ALIASES) {
    if (aliases.some((alias) => normalize(alias) === normalizedSource)) {
      return canonicalName;
    }
  }

  return SOURCE_INGREDIENT_NAMES_BY_NORMALIZED.get(normalizedSource) ?? sourceName.trim();
}

function buildActiveIngredientAliases() {
  const aliases = new Map<string, readonly [canonicalName: string, aliasName: string]>();

  for (const [canonicalName, knownAliases] of CANONICAL_INGREDIENT_ALIASES) {
    for (const aliasName of knownAliases) {
      aliases.set(`${normalize(canonicalName)}|${normalize(aliasName)}`, [
        canonicalName,
        aliasName
      ]);
    }
  }

  for (const [, sourceName] of AGROCHEMICAL_CATALOG_ROWS) {
    const canonicalName = resolveCanonicalIngredient(sourceName);
    aliases.set(`${normalize(canonicalName)}|${normalize(canonicalName)}`, [
      canonicalName,
      canonicalName
    ] as const);
    aliases.set(`${normalize(canonicalName)}|${normalize(sourceName)}`, [
      canonicalName,
      sourceName.trim()
    ]);
  }

  return Array.from(aliases.values());
}

export const ACTIVE_INGREDIENT_ALIASES = buildActiveIngredientAliases();

function sqlLiteral(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/gu, "''")}'`;
}

function splitSimpleConcentration(sourceValue: string): readonly [string, string | null] {
  const value = sourceValue.trim();
  const match = /^(\d+(?:\.\d+)?)\s+g\/(l|kg)$/iu.exec(value);

  if (!match) {
    return [value, null];
  }

  return [match[1], match[2].toLocaleLowerCase() === "l" ? "g/L" : "g/kg"];
}

function buildCatalogValuesSql(): string {
  return AGROCHEMICAL_CATALOG_ROWS.map(
    ([productType, activeIngredient, commercialName, sourceConcentration]) => {
      const [concentration, measurementUnit] =
        splitSimpleConcentration(sourceConcentration);

      return `      (${[
        productType,
        activeIngredient,
        commercialName,
        concentration,
        measurementUnit
      ]
        .map(sqlLiteral)
        .join(", ")})`;
    }
  ).join(",\n");
}

function buildAliasValuesSql(): string {
  return ACTIVE_INGREDIENT_ALIASES.map(
    ([canonicalName, aliasName]) =>
      `      (${sqlLiteral(canonicalName)}, ${sqlLiteral(aliasName)})`
  ).join(",\n");
}

export function buildAgrochemicalCatalogSql(): string {
  return `
    DROP TABLE IF EXISTS catalogo_ingredientes_alias_051;
    DROP TABLE IF EXISTS catalogo_agroquimicos_051;

    CREATE TEMP TABLE catalogo_ingredientes_alias_051 (
      nombre_canonico varchar(150) NOT NULL,
      nombre_alias varchar(150) NOT NULL
    );

    INSERT INTO catalogo_ingredientes_alias_051 (
      nombre_canonico,
      nombre_alias
    ) VALUES
${buildAliasValuesSql()};

    CREATE TEMP TABLE catalogo_agroquimicos_051 (
      tipo_nombre varchar(100) NOT NULL,
      ingrediente_alias varchar(150) NOT NULL,
      nombre varchar(150) NOT NULL,
      concentracion varchar(300) NOT NULL,
      unidad_medida varchar(20)
    );

    INSERT INTO catalogo_agroquimicos_051 (
      tipo_nombre,
      ingrediente_alias,
      nombre,
      concentracion,
      unidad_medida
    ) VALUES
${buildCatalogValuesSql()};

    INSERT INTO tipos_producto_fitosanitario (nombre)
    SELECT DISTINCT catalogo.tipo_nombre
    FROM catalogo_agroquimicos_051 catalogo
    WHERE NOT EXISTS (
      SELECT 1
      FROM tipos_producto_fitosanitario existente
      WHERE regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
        regexp_replace(lower(trim(catalogo.tipo_nombre)), '[[:space:]]+', ' ', 'g')
    );

    INSERT INTO ingredientes_activos (nombre)
    SELECT DISTINCT alias_canonico.nombre_canonico
    FROM catalogo_ingredientes_alias_051 alias_canonico
    WHERE NOT EXISTS (
      SELECT 1
      FROM ingredientes_activos existente
      INNER JOIN catalogo_ingredientes_alias_051 alias_existente
        ON regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(alias_existente.nombre_alias)), '[[:space:]]+', ' ', 'g')
      WHERE regexp_replace(lower(trim(alias_existente.nombre_canonico)), '[[:space:]]+', ' ', 'g') =
        regexp_replace(lower(trim(alias_canonico.nombre_canonico)), '[[:space:]]+', ' ', 'g')
    );

    WITH nombres_de_tipo_unico AS (
      SELECT catalogo.nombre
      FROM catalogo_agroquimicos_051 catalogo
      GROUP BY catalogo.nombre
      HAVING count(DISTINCT regexp_replace(
        lower(trim(catalogo.tipo_nombre)),
        '[[:space:]]+',
        ' ',
        'g'
      )) = 1
    ),
    catalogo_resuelto AS (
      SELECT
        catalogo.nombre,
        catalogo.concentracion,
        catalogo.unidad_medida,
        tipo.id AS tipo_producto_id,
        ingrediente.id AS ingrediente_activo_id
      FROM catalogo_agroquimicos_051 catalogo
      INNER JOIN nombres_de_tipo_unico unico
        ON regexp_replace(lower(trim(unico.nombre)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(catalogo.nombre)), '[[:space:]]+', ' ', 'g')
      INNER JOIN LATERAL (
        SELECT existente.id
        FROM tipos_producto_fitosanitario existente
        WHERE regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(catalogo.tipo_nombre)), '[[:space:]]+', ' ', 'g')
        ORDER BY existente.id
        LIMIT 1
      ) tipo ON true
      INNER JOIN catalogo_ingredientes_alias_051 ingrediente_alias
        ON regexp_replace(lower(trim(ingrediente_alias.nombre_alias)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(catalogo.ingrediente_alias)), '[[:space:]]+', ' ', 'g')
      INNER JOIN LATERAL (
        SELECT existente.id
        FROM ingredientes_activos existente
        INNER JOIN catalogo_ingredientes_alias_051 alias_existente
          ON regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
            regexp_replace(lower(trim(alias_existente.nombre_alias)), '[[:space:]]+', ' ', 'g')
        WHERE regexp_replace(lower(trim(alias_existente.nombre_canonico)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(ingrediente_alias.nombre_canonico)), '[[:space:]]+', ' ', 'g')
        ORDER BY
          (regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
            regexp_replace(lower(trim(ingrediente_alias.nombre_canonico)), '[[:space:]]+', ' ', 'g')) DESC,
          existente.id
        LIMIT 1
      ) ingrediente ON true
    )
    UPDATE marcas_producto marca
    SET
      tipo_producto_id = catalogo.tipo_producto_id,
      ingrediente_activo_id = COALESCE(
        marca.ingrediente_activo_id,
        catalogo.ingrediente_activo_id
      ),
      concentracion = COALESCE(marca.concentracion, catalogo.concentracion),
      unidad_medida = COALESCE(marca.unidad_medida, catalogo.unidad_medida),
      actualizado_at = now()
    FROM catalogo_resuelto catalogo
    WHERE marca.tipo_producto_id IS NULL
      AND regexp_replace(lower(trim(marca.nombre)), '[[:space:]]+', ' ', 'g') =
        regexp_replace(lower(trim(catalogo.nombre)), '[[:space:]]+', ' ', 'g');

    WITH catalogo_resuelto AS (
      SELECT
        catalogo.nombre,
        catalogo.concentracion,
        catalogo.unidad_medida,
        tipo.id AS tipo_producto_id,
        ingrediente.id AS ingrediente_activo_id
      FROM catalogo_agroquimicos_051 catalogo
      INNER JOIN LATERAL (
        SELECT existente.id
        FROM tipos_producto_fitosanitario existente
        WHERE regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(catalogo.tipo_nombre)), '[[:space:]]+', ' ', 'g')
        ORDER BY existente.id
        LIMIT 1
      ) tipo ON true
      INNER JOIN catalogo_ingredientes_alias_051 ingrediente_alias
        ON regexp_replace(lower(trim(ingrediente_alias.nombre_alias)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(catalogo.ingrediente_alias)), '[[:space:]]+', ' ', 'g')
      INNER JOIN LATERAL (
        SELECT existente.id
        FROM ingredientes_activos existente
        INNER JOIN catalogo_ingredientes_alias_051 alias_existente
          ON regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
            regexp_replace(lower(trim(alias_existente.nombre_alias)), '[[:space:]]+', ' ', 'g')
        WHERE regexp_replace(lower(trim(alias_existente.nombre_canonico)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(ingrediente_alias.nombre_canonico)), '[[:space:]]+', ' ', 'g')
        ORDER BY
          (regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
            regexp_replace(lower(trim(ingrediente_alias.nombre_canonico)), '[[:space:]]+', ' ', 'g')) DESC,
          existente.id
        LIMIT 1
      ) ingrediente ON true
    )
    UPDATE marcas_producto marca
    SET
      ingrediente_activo_id = COALESCE(
        marca.ingrediente_activo_id,
        catalogo.ingrediente_activo_id
      ),
      concentracion = COALESCE(marca.concentracion, catalogo.concentracion),
      unidad_medida = COALESCE(marca.unidad_medida, catalogo.unidad_medida),
      actualizado_at = now()
    FROM catalogo_resuelto catalogo
    WHERE marca.tipo_producto_id = catalogo.tipo_producto_id
      AND regexp_replace(lower(trim(marca.nombre)), '[[:space:]]+', ' ', 'g') =
        regexp_replace(lower(trim(catalogo.nombre)), '[[:space:]]+', ' ', 'g')
      AND (
        marca.ingrediente_activo_id IS NULL
        OR marca.concentracion IS NULL
        OR (marca.unidad_medida IS NULL AND catalogo.unidad_medida IS NOT NULL)
      );

    WITH catalogo_resuelto AS (
      SELECT
        catalogo.nombre,
        catalogo.concentracion,
        catalogo.unidad_medida,
        tipo.id AS tipo_producto_id,
        ingrediente.id AS ingrediente_activo_id
      FROM catalogo_agroquimicos_051 catalogo
      INNER JOIN LATERAL (
        SELECT existente.id
        FROM tipos_producto_fitosanitario existente
        WHERE regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(catalogo.tipo_nombre)), '[[:space:]]+', ' ', 'g')
        ORDER BY existente.id
        LIMIT 1
      ) tipo ON true
      INNER JOIN catalogo_ingredientes_alias_051 ingrediente_alias
        ON regexp_replace(lower(trim(ingrediente_alias.nombre_alias)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(catalogo.ingrediente_alias)), '[[:space:]]+', ' ', 'g')
      INNER JOIN LATERAL (
        SELECT existente.id
        FROM ingredientes_activos existente
        INNER JOIN catalogo_ingredientes_alias_051 alias_existente
          ON regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
            regexp_replace(lower(trim(alias_existente.nombre_alias)), '[[:space:]]+', ' ', 'g')
        WHERE regexp_replace(lower(trim(alias_existente.nombre_canonico)), '[[:space:]]+', ' ', 'g') =
          regexp_replace(lower(trim(ingrediente_alias.nombre_canonico)), '[[:space:]]+', ' ', 'g')
        ORDER BY
          (regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
            regexp_replace(lower(trim(ingrediente_alias.nombre_canonico)), '[[:space:]]+', ' ', 'g')) DESC,
          existente.id
        LIMIT 1
      ) ingrediente ON true
    )
    INSERT INTO marcas_producto (
      nombre,
      tipo_producto_id,
      ingrediente_activo_id,
      concentracion,
      unidad_medida
    )
    SELECT
      catalogo.nombre,
      catalogo.tipo_producto_id,
      catalogo.ingrediente_activo_id,
      catalogo.concentracion,
      catalogo.unidad_medida
    FROM catalogo_resuelto catalogo
    WHERE NOT EXISTS (
      SELECT 1
      FROM marcas_producto existente
      WHERE regexp_replace(lower(trim(existente.nombre)), '[[:space:]]+', ' ', 'g') =
        regexp_replace(lower(trim(catalogo.nombre)), '[[:space:]]+', ' ', 'g')
        AND existente.tipo_producto_id = catalogo.tipo_producto_id
    );

    DROP TABLE catalogo_agroquimicos_051;
    DROP TABLE catalogo_ingredientes_alias_051;

    -- Rollback operativo: no borrar automaticamente productos, tipos ni
    -- ingredientes porque pueden estar referenciados por recetas o por datos
    -- sincronizados. Respaldar los catalogos y corregir hacia adelante o
    -- desactivar administrativamente solo las filas confirmadas como erroneas.
  `;
}

export const CATALOGO_AGROQUIMICOS_EXCEL_MIGRATION: DatabaseMigration = {
  id: "051-catalogo-agroquimicos-excel",
  description:
    "Carga productos e ingredientes agroquimicos faltantes desde la fuente Excel sin sobrescribir el catalogo actual.",
  sql: buildAgrochemicalCatalogSql()
};
