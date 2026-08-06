import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  execSync: vi.fn(),
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi
    .fn<(statement: string, ...params: unknown[]) => { changes: number }>()
    .mockReturnValue({ changes: 1 })
}));

vi.mock("../../shared/database/connection", () => ({
  getDatabase: () => database
}));

vi.mock("../../shared/sync/sync-events", () => ({
  notifySyncStatusChanged: vi.fn()
}));

vi.mock("../../shared/sync/sync-requests", () => ({
  scheduleSync: vi.fn()
}));

vi.mock("../../shared/database/sync-failures", () => ({
  deleteSyncFailureForEntity: vi.fn()
}));

import { deleteSyncFailureForEntity } from "../../shared/database/sync-failures";
import { scheduleSync } from "../../shared/sync/sync-requests";
import { notifySyncStatusChanged } from "../../shared/sync/sync-events";
import {
  insertSyncOutboxEntry,
  deleteOutboxEntry,
  incrementOutboxRetryCount,
  getPendingOutboxEntries
} from "../../shared/database/sync-outbox";

const entryBase = {
  entityType: "visitas_campo" as const,
  entityLocalId: "local-1",
  operation: "create" as const,
  payload: '{"id":"1"}',
  createdAt: "2026-06-15T10:00:00Z"
};

describe("sync-outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.runSync.mockReturnValue({ changes: 1 });
  });

  describe("insertSyncOutboxEntry", () => {
    it("should insert a new entry when no existing entries for the entity", () => {
      database.getAllSync.mockReturnValue([]);

      insertSyncOutboxEntry(database as never, entryBase);

      const statements = database.runSync.mock.calls.map(([s]: [string]) => s);
      expect(statements.some((s: string) => s.includes("INSERT INTO sync_outbox"))).toBe(true);
      expect(scheduleSync).toHaveBeenCalled();
      expect(notifySyncStatusChanged).toHaveBeenCalled();
    });

    it("should skip insert for create when existing entries exist (idempotent)", () => {
      database.getAllSync.mockReturnValue([{ id: 1, operation: "create" }]);

      insertSyncOutboxEntry(database as never, { ...entryBase, operation: "create" });

      const statements = database.runSync.mock.calls.map(([s]: [string]) => s);
      expect(statements.some((s: string) => s.includes("INSERT INTO sync_outbox"))).toBe(false);
    });

    it("should skip insert for update when existing entries exist", () => {
      database.getAllSync.mockReturnValue([{ id: 1, operation: "create" }]);

      insertSyncOutboxEntry(database as never, { ...entryBase, operation: "update" });

      const statements = database.runSync.mock.calls.map(([s]: [string]) => s);
      expect(statements.some((s: string) => s.includes("INSERT INTO sync_outbox"))).toBe(false);
    });

    it("should delete existing entries for delete operation before inserting", () => {
      database.getAllSync.mockReturnValue([{ id: 1, operation: "create" }]);

      insertSyncOutboxEntry(database as never, { ...entryBase, operation: "delete" });

      const statements = database.runSync.mock.calls.map(([s]: [string]) => s);
      const deleteStmt = statements.find((s: string) => s.includes("DELETE FROM sync_outbox"));
      const insertStmt = statements.find((s: string) => s.includes("INSERT INTO sync_outbox"));
      expect(deleteStmt).toBeDefined();
      expect(insertStmt).toBeDefined();
    });

    it("should skip delete-without-payload (no re-sync needed)", () => {
      database.getAllSync.mockReturnValue([{ id: 1, operation: "create" }]);

      insertSyncOutboxEntry(database as never, {
        ...entryBase,
        operation: "delete",
        payload: null
      });

      const statements = database.runSync.mock.calls.map(([s]: [string]) => s);
      expect(statements.some((s: string) => s.includes("INSERT INTO sync_outbox"))).toBe(false);
    });

    it("should clear transient failures before inserting", () => {
      database.getAllSync.mockReturnValue([]);

      insertSyncOutboxEntry(database as never, entryBase);

      expect(deleteSyncFailureForEntity).toHaveBeenCalledWith(
        database,
        "visitas_campo",
        "local-1",
        "transient"
      );
    });

    it("should default payload to null when not provided", () => {
      database.getAllSync.mockReturnValue([]);

      insertSyncOutboxEntry(database as never, { ...entryBase, payload: null });

      const calls = database.runSync.mock.calls;
      const insertCall = calls.find(([s]: [string]) => s.includes("INSERT INTO sync_outbox"));
      expect(insertCall).toBeDefined();
    });
  });

  describe("getPendingOutboxEntries", () => {
    it("should return mapped entries from sync_outbox table", () => {
      database.getAllSync.mockReturnValue([{
        id: 1,
        entity_type: "visitas_campo",
        entity_local_id: "local-1",
        operation: "create",
        payload: '{"id":"1"}',
        retry_count: 0,
        created_at: "2026-01-01"
      }]);

      const result = getPendingOutboxEntries(50);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        entityType: "visitas_campo",
        entityLocalId: "local-1",
        operation: "create"
      });
      expect(database.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id, entity_type"),
        50
      );
    });

    it("should return empty array when no pending entries", () => {
      database.getAllSync.mockReturnValue([]);

      const result = getPendingOutboxEntries();

      expect(result).toEqual([]);
    });
  });

  describe("deleteOutboxEntry", () => {
    it("should delete entry by id and notify sync status", () => {
      deleteOutboxEntry(42);

      expect(database.runSync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM sync_outbox"),
        42
      );
      expect(notifySyncStatusChanged).toHaveBeenCalled();
    });
  });

  describe("incrementOutboxRetryCount", () => {
    it("should increment retry_count and notify sync status", () => {
      incrementOutboxRetryCount(7);

      expect(database.runSync).toHaveBeenCalledWith(
        expect.stringContaining("SET retry_count = retry_count + 1"),
        7
      );
      expect(notifySyncStatusChanged).toHaveBeenCalled();
    });
  });
});
