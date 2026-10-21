/// <reference types="node" />

import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "./migrations";
import { SQL_SCHEMA } from "./schema";

let NativeDatabase: typeof DatabaseSync | undefined;
try {
  ({ DatabaseSync: NativeDatabase } = await import("node:sqlite"));
} catch {
  // Node 20 has no node:sqlite. CI uses Node 24 and runs these real-engine tests.
}

const databases: DatabaseSync[] = [];
const LEGACY_CREDITORS_SCHEMA = `CREATE TABLE acreedores_cosecha (
  local_id TEXT PRIMARY KEY NOT NULL, public_id TEXT NOT NULL,
  productor_id TEXT NOT NULL, nombres_acreedor TEXT NOT NULL,
  apellidos_acreedor TEXT NOT NULL, tipo_documento_acreedor TEXT NOT NULL,
  nro_documento_acreedor TEXT NOT NULL, banco TEXT NOT NULL, nro_cuenta TEXT NOT NULL,
  server_id TEXT, sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sync_error_message TEXT,
  owner_user_id TEXT NOT NULL, catalog_visible INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (productor_id) REFERENCES productores(id)
)`;

function createDatabase() {
  if (!NativeDatabase) throw new Error("SQLite real requiere Node 22 o posterior.");
  const raw = new NativeDatabase(":memory:");
  databases.push(raw);
  raw.exec("PRAGMA foreign_keys = OFF");
  const statements: string[] = [];
  let inTransaction = false;
  let failOn: string | null = null;
  const adapter = {
    execSync(sql: string) {
      statements.push(sql);
      if (sql === failOn) throw new Error("synthetic migration failure");
      raw.exec(sql);
      if (sql === "BEGIN") inTransaction = true;
      if (sql === "COMMIT" || sql === "ROLLBACK") inTransaction = false;
    },
    runSync(sql: string, ...parameters: SQLInputValue[]) {
      return raw.prepare(sql).run(...parameters);
    },
    getAllSync<T>(sql: string, ...parameters: SQLInputValue[]): T[] {
      return raw.prepare(sql).all(...parameters) as T[];
    },
    getFirstSync<T>(sql: string, ...parameters: SQLInputValue[]): T | null {
      return (raw.prepare(sql).get(...parameters) as T | undefined) ?? null;
    },
    isInTransactionSync: () => inTransaction
  };

  return {
    raw,
    db: adapter as unknown as SQLiteDatabase,
    statements,
    failOn: (sql: string | null) => {
      failOn = sql;
    }
  };
}

function createVersion74Database(reviewColumns: "none" | "partial" | "all") {
  const fixture = createDatabase();
  for (const sql of SQL_SCHEMA) {
    fixture.raw.exec(
      reviewColumns !== "all" &&
        sql.startsWith("CREATE TABLE IF NOT EXISTS acreedores_cosecha")
        ? LEGACY_CREDITORS_SCHEMA
        : sql
    );
  }
  if (reviewColumns === "partial") {
    fixture.raw.exec(
      "ALTER TABLE acreedores_cosecha ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(approval_status IN ('PENDING','APPROVED','OBSERVED'))"
    );
  }
  fixture.raw.exec(`CREATE TABLE sync_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL,
    entity_local_id TEXT NOT NULL, operation TEXT NOT NULL, created_at TEXT NOT NULL,
    payload TEXT, retry_count INTEGER NOT NULL DEFAULT 0, owner_user_id TEXT
  )`);
  fixture.raw.exec("PRAGMA user_version = 74");
  seedPendingData(fixture.raw);
  return fixture;
}

function seedPendingData(raw: DatabaseSync) {
  const now = "2026-10-19T00:00:00.000Z";
  raw
    .prepare(
      "INSERT INTO productores (id, public_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
    )
    .run("synthetic-producer", "synthetic-producer-public", now, now);
  for (const syncStatus of ["pending", "synced"]) {
    raw
      .prepare(
        `INSERT INTO acreedores_cosecha
      (local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
       tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
       sync_status, created_at, updated_at, owner_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `creditor-${syncStatus}`,
        `public-${syncStatus}`,
        "synthetic-producer",
        "Prueba",
        "Sintetica",
        "DNI",
        "00000000",
        "BCP",
        "0000000000",
        syncStatus,
        now,
        now,
        "synthetic-owner"
      );
  }
  raw
    .prepare(
      `INSERT INTO visitas_comerciales
    (local_id, public_id, owner_user_id, tipo_sujeto, nombres, descripcion,
     fecha_visita, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "synthetic-visit",
      "synthetic-visit-public",
      "synthetic-owner",
      "PERSONA",
      "Prueba",
      "Visita pendiente sintetica",
      "2026-10-19",
      now,
      now
    );
  raw
    .prepare(
      `INSERT INTO visit_form_drafts
    (owner_user_id, scope_key, module_key, payload_json, updated_at)
    VALUES (?, ?, ?, ?, ?)`
    )
    .run("synthetic-owner", "synthetic-visit", "datos", '{"plantsCount":0}', now);
  for (const [type, id] of [
    ["acreedores_cosecha", "creditor-pending"],
    ["visitas_comerciales", "synthetic-visit"]
  ]) {
    raw
      .prepare(
        `INSERT INTO sync_outbox
      (entity_type, entity_local_id, operation, payload, created_at, owner_user_id)
      VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(type, id, "create", JSON.stringify({ publicId: id }), now, "synthetic-owner");
  }
}

function pendingSnapshot(raw: DatabaseSync) {
  return {
    outbox: raw.prepare("SELECT * FROM sync_outbox ORDER BY id").all(),
    visits: raw.prepare("SELECT * FROM visitas_comerciales").all(),
    drafts: raw.prepare("SELECT * FROM visit_form_drafts").all(),
    producers: raw.prepare("SELECT * FROM productores").all()
  };
}

function expectOnlyCommercialSchemaChecks(statements: string[]) {
  expect(
    statements.every((sql) =>
      /^CREATE (?:TABLE|INDEX) IF NOT EXISTS (?:visitas_comerciales|idx_visitas_comerciales_owner_fecha)\b/u.test(
        sql
      )
    )
  ).toBe(true);
}

afterEach(() => {
  for (const raw of databases.splice(0)) raw.close();
});

describe.skipIf(!NativeDatabase)("bootstrap con SQLite real", () => {
  it("inicializa una instalación vacía hasta 81 y permite volver a abrirla", () => {
    const { raw, db, statements } = createDatabase();
    runMigrations(db);
    expect(raw.prepare("PRAGMA user_version").get()?.user_version).toBe(81);
    raw.exec("PRAGMA foreign_keys = ON");
    expect(raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);

    statements.length = 0;
    runMigrations(db);
    expectOnlyCommercialSchemaChecks(statements);
  });

  it("accepts linked visits and identity-only creditors after migration", () => {
    const { raw, db } = createDatabase();
    runMigrations(db);
    const now = "2026-10-21T00:00:00.000Z";
    raw.prepare("INSERT INTO productores (id, public_id, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run("new-producer", "new-producer-public", now, now);
    raw.prepare(`INSERT INTO visitas_comerciales
      (local_id, public_id, owner_user_id, tipo_sujeto, productor_id, nombres,
       descripcion, fecha_visita, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("new-visit", "new-visit-public", "owner", "COOPERATIVA", "new-producer",
        "Cooperativa sintetica", "Visita sintetica", "2026-10-21", now, now);
    raw.prepare(`INSERT INTO acreedores_cosecha
      (local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
       tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
       approval_status, created_at, updated_at, owner_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'INCOMPLETE', ?, ?, ?)`)
      .run("new-creditor", "new-creditor-public", "new-producer", "Maria", "Prueba",
        "DNI", "12345678", now, now, "owner");

    expect(raw.prepare("SELECT productor_id, tipo_sujeto FROM visitas_comerciales WHERE local_id = 'new-visit'").get())
      .toMatchObject({ productor_id: "new-producer", tipo_sujeto: "COOPERATIVA" });
    expect(raw.prepare("SELECT approval_status, banco, nro_cuenta FROM acreedores_cosecha WHERE local_id = 'new-creditor'").get())
      .toMatchObject({ approval_status: "INCOMPLETE", banco: null, nro_cuenta: null });
    expect(raw.prepare("PRAGMA table_info(fotos_comerciales_productor)").all().map((column) => column.name))
      .toEqual(expect.arrayContaining(["visita_comercial_id", "acreedor_local_id"]));
    runMigrations(db);
    expect(raw.prepare("SELECT COUNT(*) AS total FROM visitas_comerciales WHERE local_id = 'new-visit'").get()?.total).toBe(1);
    expect(raw.prepare("SELECT COUNT(*) AS total FROM acreedores_cosecha WHERE local_id = 'new-creditor'").get()?.total).toBe(1);
    raw.exec("PRAGMA foreign_keys = ON");
    expect(raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it.each(["none", "partial", "all"] as const)(
    "recupera versión 74 con columnas %s sin perder registros ni pendientes",
    (columns) => {
      const { raw, db } = createVersion74Database(columns);
      const pending = pendingSnapshot(raw);
      const originalCreditors = raw
        .prepare("SELECT * FROM acreedores_cosecha ORDER BY local_id")
        .all();
      if (columns === "all") {
        raw.exec(
          "UPDATE acreedores_cosecha SET source = 'PRODUCTOR', review_observation = 'Observacion sintetica'"
        );
      }

      runMigrations(db);

      expect(raw.prepare("PRAGMA user_version").get()?.user_version).toBe(81);
      expect(pendingSnapshot(raw)).toEqual(pending);
      const creditors = raw
        .prepare("SELECT * FROM acreedores_cosecha ORDER BY local_id")
        .all();
      expect(creditors).toHaveLength(2);
      for (const [index, creditor] of creditors.entries()) {
        expect(creditor).toMatchObject({
          ...originalCreditors[index],
          approval_status: creditor.sync_status === "synced" ? "APPROVED" : "PENDING",
          source: columns === "all" ? "PRODUCTOR" : "MOBILE",
          review_observation: columns === "all" ? "Observacion sintetica" : null
        });
      }
      raw.exec("PRAGMA foreign_keys = ON");
      expect(raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    }
  );

  it("no cambia estados ni pendientes de una base que ya estaba en 81", () => {
    const { raw, db, statements } = createDatabase();
    runMigrations(db);
    seedPendingData(raw);
    raw.exec(
      "UPDATE acreedores_cosecha SET approval_status = 'OBSERVED', review_observation = 'Conservar'"
    );
    const before = raw
      .prepare("SELECT * FROM acreedores_cosecha ORDER BY local_id")
      .all();
    const pending = pendingSnapshot(raw);
    statements.length = 0;

    runMigrations(db);

    expect(
      raw.prepare("SELECT * FROM acreedores_cosecha ORDER BY local_id").all()
    ).toEqual(before);
    expect(pendingSnapshot(raw)).toEqual(pending);
    expectOnlyCommercialSchemaChecks(statements);
  });

  it("repara la tabla comercial ausente en 81 sin repetir migraciones ni tocar productores", () => {
    const { raw, db, statements } = createDatabase();
    runMigrations(db);
    raw.exec("DROP TABLE visitas_comerciales");
    raw
      .prepare(
        "INSERT INTO productores (id, public_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
      )
      .run("synthetic-existing", "synthetic-public", "2026-10-19", "2026-10-19");
    const producers = raw.prepare("SELECT * FROM productores").all();
    statements.length = 0;

    runMigrations(db);

    expect(raw.prepare("PRAGMA user_version").get()?.user_version).toBe(81);
    expect(raw.prepare("SELECT * FROM productores").all()).toEqual(producers);
    expect(raw.prepare("SELECT * FROM visitas_comerciales").all()).toEqual([]);
    expect(
      raw
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_visitas_comerciales_owner_fecha'"
        )
        .get()?.name
    ).toBe("idx_visitas_comerciales_owner_fecha");
    expectOnlyCommercialSchemaChecks(statements);
  });

  it("revierte una migración fallida sin avanzar la versión y admite reintento", () => {
    const { raw, db, failOn } = createVersion74Database("none");
    const pending = pendingSnapshot(raw);
    const before = raw
      .prepare("SELECT * FROM acreedores_cosecha ORDER BY local_id")
      .all();
    failOn(
      "UPDATE acreedores_cosecha SET approval_status = 'APPROVED' WHERE sync_status = 'synced'"
    );

    expect(() => runMigrations(db)).toThrow("synthetic migration failure");
    expect(raw.prepare("PRAGMA user_version").get()?.user_version).toBe(74);
    expect(
      raw.prepare("SELECT * FROM acreedores_cosecha ORDER BY local_id").all()
    ).toEqual(before);
    expect(pendingSnapshot(raw)).toEqual(pending);

    failOn(null);
    runMigrations(db);
    expect(raw.prepare("PRAGMA user_version").get()?.user_version).toBe(81);
    expect(pendingSnapshot(raw)).toEqual(pending);
  });
});
