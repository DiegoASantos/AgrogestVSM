import { describe, expect, it } from "vitest";

import { runMigrations } from "./migrations";

const LATEST_MIGRATION_VERSION = 28;

type FakeDatabase = {
  currentVersion: number;
  executedStatements: string[];
  productorColumns: Set<string>;
  pestDiseaseColumns: Set<string>;
  incidenceLevelColumns: Set<string>;
  visitaRiegosColumns: Set<string>;
  visitaEvaluacionesColumns: Set<string>;
  visitaObservacionesSanitariasColumns: Set<string>;
  detalleNutrientesRows: Array<{ id: string; name: string }>;
  appMetaRows: Map<string, string | null>;
  organosRows: Array<{
    local_id: string;
    visita_observacion_sanitaria_local_id: string;
    organo: string;
    created_at: string;
  }>;
  organosNextRows: FakeDatabase["organosRows"];
  organosTableUsesNewConstraint: boolean;
  execSync: (statement: string) => void;
  getAllSync: <T>(statement: string) => T[];
  getFirstSync: <T>(statement: string) => T | null;
  withTransactionSync: (callback: () => void) => void;
};

function createFakeDatabase(
  currentVersion: number,
  productorColumns: Iterable<string> = [],
  pestDiseaseColumns: Iterable<string> = [],
  incidenceLevelColumns: Iterable<string> = [],
  visitaRiegosColumns: Iterable<string> = [],
  visitaEvaluacionesColumns: Iterable<string> = [],
  visitaObservacionesSanitariasColumns: Iterable<string> = []
): FakeDatabase {
  return {
    currentVersion,
    executedStatements: [],
    productorColumns: new Set(productorColumns),
    pestDiseaseColumns: new Set(pestDiseaseColumns),
    incidenceLevelColumns: new Set(incidenceLevelColumns),
    visitaRiegosColumns: new Set(visitaRiegosColumns),
    visitaEvaluacionesColumns: new Set(visitaEvaluacionesColumns),
    visitaObservacionesSanitariasColumns: new Set(visitaObservacionesSanitariasColumns),
    detalleNutrientesRows: [],
    appMetaRows: new Map(),
    organosRows: [],
    organosNextRows: [],
    organosTableUsesNewConstraint: false,
    execSync(statement) {
      this.executedStatements.push(statement);
      const normalizedStatement = statement.replace(/\s+/gu, " ").trim();

      if (statement.startsWith("PRAGMA user_version = ")) {
        this.currentVersion = Number.parseInt(
          statement.replace("PRAGMA user_version = ", ""),
          10
        );
        return;
      }

      if (statement.startsWith("CREATE TABLE IF NOT EXISTS productores")) {
        this.productorColumns = new Set([
          "id",
          "public_id",
          "document_type_id",
          "document_number",
          "first_name",
          "last_name",
          "phone",
          "email",
          "address",
          "is_active",
          "created_at",
          "updated_at"
        ]);
        return;
      }

      if (statement.startsWith("CREATE TABLE IF NOT EXISTS pest_diseases")) {
        this.pestDiseaseColumns = new Set([
          "id",
          "scientific_name",
          "name",
          "type",
          "phenological_stage_id",
          "is_active"
        ]);
        return;
      }

      if (statement.startsWith("CREATE TABLE IF NOT EXISTS incidence_levels")) {
        this.incidenceLevelColumns = new Set(["id", "name", "sort_order", "type"]);
        return;
      }

      if (statement.startsWith("CREATE TABLE IF NOT EXISTS visita_riegos")) {
        if (this.visitaRiegosColumns.size > 0) {
          return;
        }

        const baseColumns = [
          "local_id",
          "server_id",
          "visita_local_id",
          "tipo_riego_id",
          "sync_status",
          "sync_error_message",
          "created_at",
          "updated_at"
        ];
        const contextColumns = [
          "fuente_agua",
          "tipo_suelo",
          "humedad_suelo",
          "estres_hidrico"
        ];

        this.visitaRiegosColumns = new Set(
          statement.includes("fuente_agua")
            ? [...baseColumns, ...contextColumns]
            : baseColumns
        );
        return;
      }

      if (statement.startsWith("CREATE TABLE IF NOT EXISTS visita_evaluaciones")) {
        if (this.visitaEvaluacionesColumns.size > 0) {
          return;
        }

        this.visitaEvaluacionesColumns = new Set([
          "local_id",
          "server_id",
          "visita_local_id",
          "sort_order",
          ...(statement.includes("incidence_percentage") ? ["incidence_percentage"] : []),
          "percentage",
          "description",
          ...(statement.includes("organos_afectados") ? ["organos_afectados"] : []),
          "sync_status",
          "created_at",
          "updated_at"
        ]);
        return;
      }

      if (
        statement.startsWith("CREATE TABLE IF NOT EXISTS visita_observaciones_sanitarias")
      ) {
        if (this.visitaObservacionesSanitariasColumns.size > 0) {
          return;
        }

        this.visitaObservacionesSanitariasColumns = new Set([
          "local_id",
          "server_id",
          "visita_local_id",
          "pest_disease_id",
          "incidence_level_id",
          "severity_level_id",
          ...(statement.includes("incidence_percentage") ? ["incidence_percentage"] : []),
          "observation",
          "sync_status",
          "created_at",
          "updated_at"
        ]);
        return;
      }

      if (statement.startsWith("ALTER TABLE productores ADD COLUMN ")) {
        const parts = statement.split(/\s+/u);
        const columnName = parts[5];

        if (!columnName) {
          throw new Error(`Could not parse column from statement: ${statement}`);
        }

        if (this.productorColumns.has(columnName)) {
          throw new Error(`Duplicate column: ${columnName}`);
        }

        this.productorColumns.add(columnName);
      }

      if (statement.startsWith("ALTER TABLE pest_diseases ADD COLUMN ")) {
        const parts = statement.split(/\s+/u);
        const columnName = parts[5];

        if (!columnName) {
          throw new Error(`Could not parse column from statement: ${statement}`);
        }

        if (this.pestDiseaseColumns.has(columnName)) {
          throw new Error(`Duplicate column: ${columnName}`);
        }

        this.pestDiseaseColumns.add(columnName);
      }

      if (statement.startsWith("ALTER TABLE incidence_levels ADD COLUMN ")) {
        const parts = statement.split(/\s+/u);
        const columnName = parts[5];

        if (!columnName) {
          throw new Error(`Could not parse column from statement: ${statement}`);
        }

        if (this.incidenceLevelColumns.has(columnName)) {
          throw new Error(`Duplicate column: ${columnName}`);
        }

        this.incidenceLevelColumns.add(columnName);
      }

      if (statement.startsWith("ALTER TABLE visita_riegos ADD COLUMN ")) {
        const parts = statement.split(/\s+/u);
        const columnName = parts[5];

        if (!columnName) {
          throw new Error(`Could not parse column from statement: ${statement}`);
        }

        if (this.visitaRiegosColumns.has(columnName)) {
          throw new Error(`Duplicate column: ${columnName}`);
        }

        this.visitaRiegosColumns.add(columnName);
      }

      if (statement.startsWith("ALTER TABLE visita_evaluaciones ADD COLUMN ")) {
        const parts = statement.split(/\s+/u);
        const columnName = parts[5];

        if (!columnName) {
          throw new Error(`Could not parse column from statement: ${statement}`);
        }

        if (this.visitaEvaluacionesColumns.has(columnName)) {
          throw new Error(`Duplicate column: ${columnName}`);
        }

        this.visitaEvaluacionesColumns.add(columnName);
      }

      if (
        statement.startsWith("ALTER TABLE visita_observaciones_sanitarias ADD COLUMN ")
      ) {
        const parts = statement.split(/\s+/u);
        const columnName = parts[5];

        if (!columnName) {
          throw new Error(`Could not parse column from statement: ${statement}`);
        }

        if (this.visitaObservacionesSanitariasColumns.has(columnName)) {
          throw new Error(`Duplicate column: ${columnName}`);
        }

        this.visitaObservacionesSanitariasColumns.add(columnName);
      }

      if (statement === "ALTER TABLE pest_diseases DROP COLUMN code") {
        this.pestDiseaseColumns.delete("code");
      }

      if (statement === "DELETE FROM detalle_nutrientes WHERE name LIKE '%Grado 0%'") {
        this.detalleNutrientesRows = this.detalleNutrientesRows.filter(
          (row) => !row.name.includes("Grado 0")
        );
        return;
      }

      if (statement === "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'") {
        this.appMetaRows.delete("catalogs_downloaded_at");
        return;
      }

      if (
        normalizedStatement.startsWith(
          "CREATE TABLE IF NOT EXISTS visita_observacion_sanitaria_organos_next"
        ) ||
        normalizedStatement.startsWith(
          "CREATE TABLE visita_observacion_sanitaria_organos_next"
        )
      ) {
        this.organosNextRows = [];
        return;
      }

      if (
        normalizedStatement.startsWith(
          "CREATE TABLE IF NOT EXISTS visita_observacion_sanitaria_organos"
        )
      ) {
        this.organosTableUsesNewConstraint =
          normalizedStatement.includes("fruto_recien_cuajado");
        return;
      }

      if (
        normalizedStatement.startsWith(
          "INSERT OR IGNORE INTO visita_observacion_sanitaria_organos_next"
        )
      ) {
        const allowedOrganos = new Set([
          "hoja",
          "tallo",
          "flores",
          "fruto",
          "tronco_rama",
          "yema_apical",
          "brote_vegetativo",
          "hoja_tierna",
          "hoja_madura",
          "panicula_floral",
          "flor_individual",
          "fruto_recien_cuajado",
          "fruto_verde",
          "fruto_maduro",
          "raices"
        ]);
        const mappedOrganos: Record<string, string> = {
          tallo: "tronco_rama",
          flores: "flor_individual",
          fruto: "fruto_verde"
        };

        if (normalizedStatement.includes("WHEN 'hoja' THEN 'hoja_tierna'")) {
          mappedOrganos.hoja = "hoja_tierna";
        }

        for (const row of this.organosRows) {
          if (!allowedOrganos.has(row.organo)) {
            continue;
          }

          const nextRow = {
            ...row,
            organo: mappedOrganos[row.organo] ?? row.organo
          };
          const hasDuplicate = this.organosNextRows.some(
            (existing) =>
              existing.visita_observacion_sanitaria_local_id ===
                nextRow.visita_observacion_sanitaria_local_id &&
              existing.organo === nextRow.organo
          );

          if (!hasDuplicate) {
            this.organosNextRows.push(nextRow);
          }
        }
        return;
      }

      if (
        statement === "DROP TABLE IF EXISTS visita_observacion_sanitaria_organos_next"
      ) {
        this.organosNextRows = [];
        return;
      }

      if (statement === "DROP TABLE visita_observacion_sanitaria_organos") {
        this.organosRows = [];
        this.organosTableUsesNewConstraint = false;
        return;
      }

      if (
        statement ===
        "ALTER TABLE visita_observacion_sanitaria_organos_next RENAME TO visita_observacion_sanitaria_organos"
      ) {
        this.organosRows = this.organosNextRows;
        this.organosNextRows = [];
        this.organosTableUsesNewConstraint = true;
      }
    },
    getAllSync<T>(statement: string) {
      if (statement === "PRAGMA table_info(productores)") {
        return Array.from(this.productorColumns, (name) => ({ name })) as T[];
      }

      if (statement === "PRAGMA table_info(pest_diseases)") {
        return Array.from(this.pestDiseaseColumns, (name) => ({ name })) as T[];
      }

      if (statement === "PRAGMA table_info(incidence_levels)") {
        return Array.from(this.incidenceLevelColumns, (name) => ({ name })) as T[];
      }

      if (statement === "PRAGMA table_info(visita_riegos)") {
        return Array.from(this.visitaRiegosColumns, (name) => ({ name })) as T[];
      }

      if (statement === "PRAGMA table_info(visita_evaluaciones)") {
        return Array.from(this.visitaEvaluacionesColumns, (name) => ({ name })) as T[];
      }

      if (statement === "PRAGMA table_info(visita_observaciones_sanitarias)") {
        return Array.from(this.visitaObservacionesSanitariasColumns, (name) => ({
          name
        })) as T[];
      }

      return [];
    },
    getFirstSync<T>(statement: string) {
      if (statement === "PRAGMA user_version") {
        return { user_version: this.currentVersion } as T;
      }

      return null;
    },
    withTransactionSync(callback) {
      callback();
    }
  };
}

function createDatabaseBeforeOrganoRefresh(): FakeDatabase {
  const db = createFakeDatabase(20);
  db.organosRows = [
    {
      local_id: "organo-1",
      visita_observacion_sanitaria_local_id: "obs-1",
      organo: "tallo",
      created_at: "2026-06-17T08:00:00.000Z"
    },
    {
      local_id: "organo-2",
      visita_observacion_sanitaria_local_id: "obs-1",
      organo: "flores",
      created_at: "2026-06-17T08:01:00.000Z"
    },
    {
      local_id: "organo-3",
      visita_observacion_sanitaria_local_id: "obs-1",
      organo: "fruto",
      created_at: "2026-06-17T08:02:00.000Z"
    },
    {
      local_id: "organo-4",
      visita_observacion_sanitaria_local_id: "obs-1",
      organo: "hoja",
      created_at: "2026-06-17T08:03:00.000Z"
    },
    {
      local_id: "organo-5",
      visita_observacion_sanitaria_local_id: "obs-1",
      organo: "valor_obsoleto",
      created_at: "2026-06-17T08:04:00.000Z"
    }
  ];
  return db;
}

describe("runMigrations", () => {
  it("skips duplicate productor name columns on a fresh install", () => {
    const db = createFakeDatabase(0);

    expect(() => runMigrations(db as never)).not.toThrow();
    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.executedStatements).not.toContain(
      "ALTER TABLE productores ADD COLUMN first_name TEXT"
    );
    expect(db.executedStatements).not.toContain(
      "ALTER TABLE productores ADD COLUMN last_name TEXT"
    );
    expect(db.executedStatements).toContain(
      "CREATE INDEX IF NOT EXISTS idx_visitas_campo_agronomist_recent ON visitas_campo(agronomist_user_id, created_at DESC)"
    );
    expect(db.executedStatements).toContain(
      "CREATE INDEX IF NOT EXISTS idx_sub_etapas_etapa ON sub_etapas(etapa_fenologica_id)"
    );
    expect(db.executedStatements).not.toContain(
      "ALTER TABLE pest_diseases DROP COLUMN code"
    );
  });

  it("adds missing productor name columns when upgrading an older database", () => {
    const db = createFakeDatabase(
      6,
      [
        "id",
        "public_id",
        "document_type_id",
        "document_number",
        "phone",
        "email",
        "address",
        "is_active",
        "created_at",
        "updated_at"
      ],
      ["id", "code", "name", "type", "is_active"],
      ["id", "name", "sort_order"]
    );

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.productorColumns.has("first_name")).toBe(true);
    expect(db.productorColumns.has("last_name")).toBe(true);
    expect(db.executedStatements).toContain(
      "ALTER TABLE productores ADD COLUMN first_name TEXT"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE productores ADD COLUMN last_name TEXT"
    );
    expect(db.executedStatements).toContain(
      "CREATE INDEX IF NOT EXISTS idx_visitas_campo_agronomist_recent ON visitas_campo(agronomist_user_id, created_at DESC)"
    );
    expect(db.executedStatements).toContain(
      "CREATE INDEX IF NOT EXISTS idx_sub_etapas_etapa ON sub_etapas(etapa_fenologica_id)"
    );
    expect(db.pestDiseaseColumns.has("scientific_name")).toBe(true);
    expect(db.pestDiseaseColumns.has("code")).toBe(false);
    expect(db.executedStatements).toContain(
      "ALTER TABLE pest_diseases ADD COLUMN scientific_name TEXT"
    );
    expect(db.executedStatements).toContain("ALTER TABLE pest_diseases DROP COLUMN code");
    expect(db.pestDiseaseColumns.has("phenological_stage_id")).toBe(true);
    expect(db.executedStatements).toContain(
      "ALTER TABLE pest_diseases ADD COLUMN phenological_stage_id TEXT"
    );
    expect(db.incidenceLevelColumns.has("type")).toBe(true);
    expect(db.executedStatements).toContain(
      "ALTER TABLE incidence_levels ADD COLUMN type TEXT NOT NULL DEFAULT 'incidencia'"
    );
  });

  it("migrates old sanitary organ values into the current organ catalog", () => {
    const db = createDatabaseBeforeOrganoRefresh();

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.organosTableUsesNewConstraint).toBe(true);
    expect(db.organosRows).toEqual([
      {
        local_id: "organo-1",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "tronco_rama",
        created_at: "2026-06-17T08:00:00.000Z"
      },
      {
        local_id: "organo-2",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "flor_individual",
        created_at: "2026-06-17T08:01:00.000Z"
      },
      {
        local_id: "organo-3",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "fruto_verde",
        created_at: "2026-06-17T08:02:00.000Z"
      },
      {
        local_id: "organo-4",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "hoja_tierna",
        created_at: "2026-06-17T08:03:00.000Z"
      }
    ]);
    expect(db.organosRows).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ organo: "valor_obsoleto" })])
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_observacion_sanitaria_organos_next RENAME TO visita_observacion_sanitaria_organos"
    );
    expect(db.executedStatements).toContain(
      "CREATE INDEX IF NOT EXISTS idx_visita_obs_sanitaria_organos_observacion ON visita_observacion_sanitaria_organos(visita_observacion_sanitaria_local_id)"
    );
  });

  it("adds the irrigation context columns to databases created before step 4 was extended", () => {
    const db = createFakeDatabase(
      21,
      [],
      [],
      [],
      [
        "local_id",
        "server_id",
        "visita_local_id",
        "tipo_riego_id",
        "sync_status",
        "sync_error_message",
        "created_at",
        "updated_at"
      ]
    );

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.visitaRiegosColumns.has("fuente_agua")).toBe(true);
    expect(db.visitaRiegosColumns.has("tipo_suelo")).toBe(true);
    expect(db.visitaRiegosColumns.has("humedad_suelo")).toBe(true);
    expect(db.visitaRiegosColumns.has("estres_hidrico")).toBe(true);
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_riegos ADD COLUMN fuente_agua TEXT DEFAULT NULL CHECK(fuente_agua IS NULL OR fuente_agua IN ('subterranea', 'superficial', 'pluvial'))"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_riegos ADD COLUMN tipo_suelo TEXT DEFAULT NULL CHECK(tipo_suelo IS NULL OR tipo_suelo IN ('arenoso', 'arcilloso', 'limoso', 'franco'))"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_riegos ADD COLUMN humedad_suelo TEXT DEFAULT NULL CHECK(humedad_suelo IS NULL OR humedad_suelo IN ('saturado', 'optimo', 'moderadamente_seco', 'seco'))"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_riegos ADD COLUMN estres_hidrico INTEGER DEFAULT NULL CHECK(estres_hidrico IS NULL OR estres_hidrico IN (0, 1))"
    );
  });

  it("removes Grado 0 nutrient details and forces a catalog refresh", () => {
    const db = createFakeDatabase(22);
    db.detalleNutrientesRows = [
      { id: "detalle-1", name: "Nitrogeno - Grado 0" },
      { id: "detalle-2", name: "Nitrogeno - Grado 1" },
      { id: "detalle-3", name: "Potasio Grado 0 inicial" }
    ];
    db.appMetaRows.set("catalogs_downloaded_at", "2026-06-18T20:00:00.000Z");
    db.appMetaRows.set("other_key", "kept");

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.detalleNutrientesRows).toEqual([
      { id: "detalle-2", name: "Nitrogeno - Grado 1" }
    ]);
    expect(db.appMetaRows.has("catalogs_downloaded_at")).toBe(false);
    expect(db.appMetaRows.get("other_key")).toBe("kept");
    expect(db.executedStatements).toContain(
      "DELETE FROM detalle_nutrientes WHERE name LIKE '%Grado 0%'"
    );
    expect(db.executedStatements).toContain(
      "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"
    );
  });

  it("updates the local sanitary organ constraint to accept the current organ values", () => {
    const db = createFakeDatabase(23);
    db.organosRows = [
      {
        local_id: "organo-1",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "hoja",
        created_at: "2026-06-18T08:00:00.000Z"
      },
      {
        local_id: "organo-2",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "hoja_madura",
        created_at: "2026-06-18T08:01:00.000Z"
      },
      {
        local_id: "organo-3",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "raices",
        created_at: "2026-06-18T08:02:00.000Z"
      }
    ];

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.organosRows).toEqual([
      {
        local_id: "organo-1",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "hoja_tierna",
        created_at: "2026-06-18T08:00:00.000Z"
      },
      {
        local_id: "organo-2",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "hoja_madura",
        created_at: "2026-06-18T08:01:00.000Z"
      },
      {
        local_id: "organo-3",
        visita_observacion_sanitaria_local_id: "obs-1",
        organo: "raices",
        created_at: "2026-06-18T08:02:00.000Z"
      }
    ]);
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_observacion_sanitaria_organos_next RENAME TO visita_observacion_sanitaria_organos"
    );
  });

  it("cleans obsolete irrigation and labor catalogs before refreshing step 5", () => {
    const db = createFakeDatabase(24);

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(
      db.executedStatements.some(
        (statement) =>
          statement.includes("DELETE FROM visitas_campo") &&
          statement.includes("Riego por inundacion pesado") &&
          statement.includes("Ruptura de Agoste")
      )
    ).toBe(true);
    expect(
      db.executedStatements.some(
        (statement) =>
          statement.includes("DELETE FROM tipos_riego") &&
          statement.includes("Riego por inundación pesado")
      )
    ).toBe(true);
    expect(
      db.executedStatements.some(
        (statement) =>
          statement.includes("DELETE FROM labores_culturales") &&
          statement.includes("Ruptura de Agoste")
      )
    ).toBe(true);
    expect(db.executedStatements).toContain(
      "ALTER TABLE labores_culturales ADD COLUMN category_code TEXT"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE labores_culturales ADD COLUMN sort_order INTEGER"
    );
    expect(db.executedStatements).toContain(
      "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"
    );
  });

  it("removes Ruptura de Agoste from irrigation catalogs and affected local visits", () => {
    const db = createFakeDatabase(25);

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(
      db.executedStatements.some(
        (statement) =>
          statement.includes("DELETE FROM sync_outbox") &&
          statement.includes("visita_riegos") &&
          statement.includes("Ruptura de Agoste")
      )
    ).toBe(true);
    expect(
      db.executedStatements.some(
        (statement) =>
          statement.includes("DELETE FROM visitas_campo") &&
          statement.includes("visita_riegos") &&
          statement.includes("Ruptura de Agoste")
      )
    ).toBe(true);
    expect(
      db.executedStatements.some(
        (statement) =>
          statement.includes("DELETE FROM tipos_riego") &&
          statement.includes("Ruptura de Agoste")
      )
    ).toBe(true);
    expect(db.executedStatements).toContain(
      "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"
    );
  });

  it("adds incidence percentage and nutrition affected organs fields", () => {
    const db = createFakeDatabase(
      26,
      [],
      [],
      [],
      [],
      [
        "local_id",
        "server_id",
        "visita_local_id",
        "sort_order",
        "percentage",
        "description",
        "sync_status",
        "created_at",
        "updated_at"
      ],
      [
        "local_id",
        "server_id",
        "visita_local_id",
        "pest_disease_id",
        "incidence_level_id",
        "severity_level_id",
        "observation",
        "sync_status",
        "created_at",
        "updated_at"
      ]
    );

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.visitaEvaluacionesColumns.has("incidence_percentage")).toBe(true);
    expect(db.visitaEvaluacionesColumns.has("organos_afectados")).toBe(true);
    expect(db.visitaObservacionesSanitariasColumns.has("incidence_percentage")).toBe(
      true
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_observaciones_sanitarias ADD COLUMN incidence_percentage TEXT DEFAULT NULL"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_evaluaciones ADD COLUMN incidence_percentage TEXT DEFAULT NULL"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE visita_evaluaciones ADD COLUMN organos_afectados TEXT DEFAULT NULL"
    );
  });

  it("does not rerun SQLite migrations when the database is already at the latest version", () => {
    const db = createDatabaseBeforeOrganoRefresh();

    runMigrations(db as never);
    const statementsAfterUpgrade = db.executedStatements.length;

    runMigrations(db as never);

    expect(db.currentVersion).toBe(LATEST_MIGRATION_VERSION);
    expect(db.executedStatements).toHaveLength(statementsAfterUpgrade);
    expect(db.organosRows).toEqual([
      expect.objectContaining({ organo: "tronco_rama" }),
      expect.objectContaining({ organo: "flor_individual" }),
      expect.objectContaining({ organo: "fruto_verde" }),
      expect.objectContaining({ organo: "hoja_tierna" })
    ]);
  });
});
