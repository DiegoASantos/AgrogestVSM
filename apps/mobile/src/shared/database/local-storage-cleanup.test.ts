/// <reference types="node" />

import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { limpiarAlmacenamientoLocal } from "./local-storage-cleanup";
import { SQL_SCHEMA } from "./schema";

const mocks = vi.hoisted(() => {
  class FakeFile {
    deleted = false;

    constructor(
      public name: string,
      public modificationTime: number | null
    ) {}

    delete() {
      this.deleted = true;
    }
  }

  return {
    FakeFile,
    cleanPhotos: vi.fn(),
    getDatabase: vi.fn(),
    listCache: vi.fn(() => [] as FakeFile[])
  };
});

vi.mock("expo-file-system", () => ({
  File: mocks.FakeFile,
  Paths: { cache: { list: mocks.listCache } }
}));
vi.mock("./connection", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("../../modules/comercial/services/fotos-comerciales.service", () => ({
  limpiarFotosComercialesSincronizadas: mocks.cleanPhotos
}));

const NOW = new Date("2026-10-24T17:00:00.000Z");
const OLD_VISIT_DATE = "2026-07-25";
const BOUNDARY_VISIT_DATE = "2026-07-26";

let NativeDatabase: typeof DatabaseSync | undefined;
try {
  ({ DatabaseSync: NativeDatabase } = await import("node:sqlite"));
} catch {
  // Node 20 does not provide node:sqlite; CI uses Node 24 for these tests.
}

type Fixture = {
  raw: DatabaseSync;
  db: SQLiteDatabase;
  compacted: string[];
  failNextCompaction: () => void;
};

const databases: DatabaseSync[] = [];

function createFixture(): Fixture {
  if (!NativeDatabase) throw new Error("SQLite real requiere Node 22 o posterior.");
  const raw = new NativeDatabase(":memory:");
  databases.push(raw);
  raw.exec("PRAGMA foreign_keys = OFF");
  for (const statement of SQL_SCHEMA) raw.exec(statement);
  raw.exec(`CREATE TABLE sync_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_local_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0
  )`);
  seedReferences(raw);
  raw.exec("PRAGMA foreign_keys = ON");

  let inTransaction = false;
  let shouldFailCompaction = false;
  const compacted: string[] = [];
  const db = {
    execSync(sql: string) {
      raw.exec(sql);
      if (sql === "BEGIN") inTransaction = true;
      if (sql === "COMMIT" || sql === "ROLLBACK") inTransaction = false;
    },
    async execAsync(sql: string) {
      compacted.push(sql);
      if (shouldFailCompaction) {
        shouldFailCompaction = false;
        throw new Error("synthetic compaction failure");
      }
      raw.exec(sql);
    },
    runSync(sql: string, ...params: unknown[]) {
      return raw.prepare(sql).run(...(params as SQLInputValue[]));
    },
    getAllSync<T>(sql: string, ...params: unknown[]) {
      return raw.prepare(sql).all(...(params as SQLInputValue[])) as T[];
    },
    getFirstSync<T>(sql: string, ...params: unknown[]) {
      return (raw.prepare(sql).get(...(params as SQLInputValue[])) as T | undefined) ?? null;
    },
    isInTransactionSync: () => inTransaction,
    withTransactionSync(task: () => void) {
      raw.exec("BEGIN");
      try {
        task();
        raw.exec("COMMIT");
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    }
  } as unknown as SQLiteDatabase;

  mocks.getDatabase.mockReturnValue(db);
  return {
    raw,
    db,
    compacted,
    failNextCompaction: () => {
      shouldFailCompaction = true;
    }
  };
}

function seedReferences(raw: DatabaseSync) {
  raw.exec(`
    INSERT INTO cultivos (id, code, name) VALUES ('crop', 'C', 'Cultivo');
    INSERT INTO variedades (id, cultivo_id, code, name) VALUES ('variety', 'crop', 'V', 'Variedad');
    INSERT INTO campanias (id, cultivo_id, name, start_date) VALUES ('campaign', 'crop', 'Campaña', '2020-01-01');
    INSERT INTO productores (id, public_id, created_at, updated_at) VALUES ('producer', 'producer-public', '2020-01-01', '2020-01-01');
    INSERT INTO departamentos (id, code, name) VALUES ('department', '01', 'Departamento');
    INSERT INTO provincias (id, departamento_id, code, name) VALUES ('province', 'department', '01', 'Provincia');
    INSERT INTO distritos (id, provincia_id, ubigeo, name) VALUES ('district', 'province', '010101', 'Distrito');
    INSERT INTO sectores (id, public_id, distrito_id, name, created_at, updated_at) VALUES ('sector', 'sector-public', 'district', 'Sector', '2020-01-01', '2020-01-01');
    INSERT INTO subsectores (id, public_id, sector_id, name, created_at, updated_at) VALUES ('subsector', 'subsector-public', 'sector', 'Subsector', '2020-01-01', '2020-01-01');
    INSERT INTO parcelas (id, public_id, productor_id, subsector_id, code, name, created_at, updated_at) VALUES ('parcel', 'parcel-public', 'producer', 'subsector', 'P1', 'Parcela', '2020-01-01', '2020-01-01');
    INSERT INTO parcelas (id, public_id, productor_id, subsector_id, code, name, created_at, updated_at) VALUES ('parcel-valid', 'parcel-valid-public', 'producer', 'subsector', 'P2', 'Parcela válida', '2020-01-01', '2020-01-01');
  `);
}

function insertVisit(
  raw: DatabaseSync,
  id: string,
  visitDate = OLD_VISIT_DATE,
  syncStatus = "synced"
) {
  raw.prepare(`
    INSERT INTO visitas_campo (
      local_id, crop_id, variety_id, parcela_id, campaign_id,
      agronomist_user_id, visit_date, start_visit_time, sync_status,
      created_at, updated_at
    ) VALUES (?, 'crop', 'variety', 'parcel', 'campaign', 'agronomist', ?, '08:00', ?, ?, ?)
  `).run(id, visitDate, syncStatus, NOW.toISOString(), NOW.toISOString());
}

function insertEvaluation(raw: DatabaseSync, visitId: string, status: string) {
  raw.prepare(`
    INSERT INTO visita_evaluaciones (
      local_id, visita_local_id, sort_order, description, sync_status, created_at, updated_at
    ) VALUES (?, ?, 0, 'evaluacion', ?, ?, ?)
  `).run(`evaluation-${visitId}`, visitId, status, NOW.toISOString(), NOW.toISOString());
}

function insertRecipeAggregate(raw: DatabaseSync, visitId: string) {
  raw.prepare(`
    INSERT INTO visita_recetas (local_id, visita_local_id, sync_status, created_at, updated_at)
    VALUES (?, ?, 'synced', ?, ?)
  `).run(`recipe-${visitId}`, visitId, NOW.toISOString(), NOW.toISOString());
  raw.prepare(`
    INSERT INTO visita_receta_mezcla (
      local_id, receta_local_id, numero, factor, sync_status, created_at, updated_at
    ) VALUES (?, ?, 1, '1', 'synced', ?, ?)
  `).run(`mix-${visitId}`, `recipe-${visitId}`, NOW.toISOString(), NOW.toISOString());
  raw.prepare(`
    INSERT INTO visita_receta_riego (
      local_id, receta_local_id, tipo_recomendacion, sync_status, created_at, updated_at
    ) VALUES (?, ?, 'riego_pesado', 'synced', ?, ?)
  `).run(`recipe-irrigation-${visitId}`, `recipe-${visitId}`, NOW.toISOString(), NOW.toISOString());
}

function insertFailure(raw: DatabaseSync, entityType: string, localId: string) {
  raw.prepare(`
    INSERT INTO sync_failures (
      entity_type, entity_local_id, operation, error_kind,
      outbox_created_at, last_attempt_at, failed_at
    ) VALUES (?, ?, 'update', 'permanent', ?, ?, ?)
  `).run(entityType, localId, NOW.toISOString(), NOW.toISOString(), NOW.toISOString());
}

function visitExists(raw: DatabaseSync, id: string) {
  return Boolean(raw.prepare("SELECT 1 FROM visitas_campo WHERE local_id = ?").get(id));
}

describe("limpiarAlmacenamientoLocal", () => {
  beforeEach(() => {
    mocks.getDatabase.mockReset();
    mocks.cleanPhotos.mockReset();
    mocks.listCache.mockReset();
    mocks.listCache.mockReturnValue([]);
  });

  afterEach(() => {
    for (const database of databases.splice(0)) database.close();
  });

  it("purga visitas sincronizadas vencidas y sus detalles, pero conserva el corte de 90 días", async () => {
    const { raw, compacted } = createFixture();
    insertVisit(raw, "expired");
    insertEvaluation(raw, "expired", "synced");
    insertRecipeAggregate(raw, "expired");
    insertVisit(raw, "boundary", BOUNDARY_VISIT_DATE);
    insertEvaluation(raw, "boundary", "synced");

    await limpiarAlmacenamientoLocal(NOW);

    expect(visitExists(raw, "expired")).toBe(false);
    expect(raw.prepare("SELECT 1 FROM visita_evaluaciones WHERE local_id = 'evaluation-expired'").get()).toBeUndefined();
    expect(raw.prepare("SELECT 1 FROM visita_recetas WHERE local_id = 'recipe-expired'").get()).toBeUndefined();
    expect(raw.prepare("SELECT 1 FROM visita_receta_mezcla WHERE local_id = 'mix-expired'").get()).toBeUndefined();
    expect(raw.prepare("SELECT 1 FROM visita_receta_riego WHERE local_id = 'recipe-irrigation-expired'").get()).toBeUndefined();
    expect(visitExists(raw, "boundary")).toBe(true);
    expect(compacted).toContain("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;");
    expect(mocks.cleanPhotos).toHaveBeenCalledOnce();
  });

  it("conserva visitas antiguas pendientes, con hijos pendientes/error, borradores, outbox o fallos", async () => {
    const { raw } = createFixture();
    insertVisit(raw, "pending-parent", OLD_VISIT_DATE, "pending");
    insertVisit(raw, "pending-child");
    insertEvaluation(raw, "pending-child", "pending");
    insertVisit(raw, "error-child");
    insertEvaluation(raw, "error-child", "error");
    insertVisit(raw, "drafted");
    insertVisit(raw, "queued");
    insertVisit(raw, "failed");
    insertVisit(raw, "outbox-child");
    insertEvaluation(raw, "outbox-child", "synced");
    insertVisit(raw, "failure-child");
    insertRecipeAggregate(raw, "failure-child");
    raw.prepare(`
      INSERT INTO visit_form_drafts (owner_user_id, scope_key, module_key, payload_json, updated_at)
      VALUES ('user', 'visit:drafted', 'datos', '{}', ?)
    `).run(NOW.toISOString());
    raw.prepare(`
      INSERT INTO sync_outbox (entity_type, entity_local_id, operation, created_at)
      VALUES ('visitas_campo', 'queued', 'update', ?),
             ('visita_evaluaciones', 'evaluation-outbox-child', 'update', ?)
    `).run(NOW.toISOString(), NOW.toISOString());
    insertFailure(raw, "visitas_campo", "failed");
    insertFailure(raw, "visita_receta_mezcla", "mix-failure-child");

    await limpiarAlmacenamientoLocal(NOW);

    for (const id of [
      "pending-parent", "pending-child", "error-child", "drafted", "queued",
      "outbox-child", "failed", "failure-child"
    ]) {
      expect(visitExists(raw, id), id).toBe(true);
    }
  });

  it("elimina solo cachés climáticas vencidas y temporales UUID de más de 24 horas", async () => {
    const { raw } = createFixture();
    raw.prepare(`
      INSERT INTO clima_parcela_cache (parcela_id, payload_json, fetched_at, expires_at, updated_at)
      VALUES ('parcel', '{}', ?, ?, ?), ('parcel-valid', '{}', ?, ?, ?)
    `).run(
      NOW.toISOString(), "2026-10-23T16:59:59.000Z", NOW.toISOString(),
      NOW.toISOString(), "2026-10-25T00:00:00.000Z", NOW.toISOString()
    );
    raw.prepare(`
      INSERT INTO clima_distrito_cache (distrito_codigo, payload_json, fetched_at, expires_at, updated_at)
      VALUES ('expired', '{}', ?, ?, ?), ('valid', '{}', ?, ?, ?)
    `).run(
      NOW.toISOString(), "2026-10-23T16:59:59.000Z", NOW.toISOString(),
      NOW.toISOString(), "2026-10-25T00:00:00.000Z", NOW.toISOString()
    );
    raw.prepare(`
      INSERT INTO clima_estacion_cache (estacion_id, payload_json, fetched_at, expires_at, updated_at)
      VALUES ('expired', '{}', ?, ?, ?), ('valid', '{}', ?, ?, ?)
    `).run(
      NOW.toISOString(), "2026-10-23T16:59:59.000Z", NOW.toISOString(),
      NOW.toISOString(), "2026-10-25T00:00:00.000Z", NOW.toISOString()
    );
    const expiredTemp = new mocks.FakeFile("123e4567-e89b-12d3-a456-426614174000.jpg", NOW.getTime() - 25 * 60 * 60 * 1_000);
    const freshTemp = new mocks.FakeFile("123e4567-e89b-12d3-a456-426614174001.jpg", NOW.getTime() - 2 * 60 * 60 * 1_000);
    const unrelated = new mocks.FakeFile("unrelated.jpg", NOW.getTime() - 30 * 60 * 60 * 1_000);
    mocks.listCache.mockReturnValue([expiredTemp, freshTemp, unrelated]);

    await limpiarAlmacenamientoLocal(NOW);

    expect(raw.prepare("SELECT count(*) AS count FROM clima_parcela_cache").get()?.count).toBe(1);
    expect(raw.prepare("SELECT count(*) AS count FROM clima_distrito_cache").get()?.count).toBe(1);
    expect(raw.prepare("SELECT count(*) AS count FROM clima_estacion_cache").get()?.count).toBe(1);
    expect(expiredTemp.deleted).toBe(true);
    expect(freshTemp.deleted).toBe(false);
    expect(unrelated.deleted).toBe(false);
  });

  it("limita la frecuencia a una vez por día y vuelve a intentar si la transacción falla", async () => {
    const { raw } = createFixture();
    await limpiarAlmacenamientoLocal(NOW);
    insertVisit(raw, "becomes-expired");
    await limpiarAlmacenamientoLocal(new Date(NOW.getTime() + 23 * 60 * 60 * 1_000));
    expect(visitExists(raw, "becomes-expired")).toBe(true);

    raw.exec(`CREATE TRIGGER reject_expired_visit_delete
      BEFORE DELETE ON visitas_campo WHEN OLD.local_id = 'becomes-expired'
      BEGIN SELECT RAISE(ABORT, 'synthetic cleanup failure'); END`);
    await expect(
      limpiarAlmacenamientoLocal(new Date(NOW.getTime() + 24 * 60 * 60 * 1_000))
    ).rejects.toThrow("synthetic cleanup failure");
    expect(visitExists(raw, "becomes-expired")).toBe(true);
    expect(raw.prepare("SELECT value FROM app_meta WHERE key = 'local_storage_cleanup_at'").get()?.value).toBe(NOW.toISOString());

    raw.exec("DROP TRIGGER reject_expired_visit_delete");
    await limpiarAlmacenamientoLocal(new Date(NOW.getTime() + 24 * 60 * 60 * 1_000));
    expect(visitExists(raw, "becomes-expired")).toBe(false);
  });

  it("reintenta la compactación pendiente sin volver a borrar ni marcar éxito antes de tiempo", async () => {
    const { raw, compacted, failNextCompaction } = createFixture();
    insertVisit(raw, "compact-after-purge");
    failNextCompaction();

    await expect(limpiarAlmacenamientoLocal(NOW)).rejects.toThrow("synthetic compaction failure");
    expect(visitExists(raw, "compact-after-purge")).toBe(false);
    expect(raw.prepare("SELECT value FROM app_meta WHERE key = 'local_storage_compaction_pending'").get()?.value).toBe("1");
    expect(raw.prepare("SELECT value FROM app_meta WHERE key = 'local_storage_cleanup_at'").get()).toBeUndefined();

    await limpiarAlmacenamientoLocal(NOW);

    expect(compacted).toHaveLength(2);
    expect(raw.prepare("SELECT value FROM app_meta WHERE key = 'local_storage_compaction_pending'").get()).toBeUndefined();
    expect(raw.prepare("SELECT value FROM app_meta WHERE key = 'local_storage_cleanup_at'").get()?.value).toBe(NOW.toISOString());
  });
});
