import { beforeEach, describe, expect, it, vi } from "vitest";

const getFirstSync = vi.fn();
const getAllSync = vi.fn();

vi.mock("../database/connection", () => ({
  getDatabase: () => ({ getFirstSync, getAllSync, runSync: vi.fn() })
}));

vi.mock("../database/catalog-status", () => ({
  getCatalogsDownloadedAt: () => null
}));

vi.mock("../database/sync-failures", () => ({
  getSyncFailures: () => []
}));

vi.mock("./sync-events", () => ({
  notifySyncStatusChanged: vi.fn(),
  subscribeToSyncStatus: vi.fn()
}));

const { getSyncCounts, getSyncErrorDetails } = await import("./sync-status");

beforeEach(() => {
  getFirstSync.mockReset();
  getAllSync.mockReset();
  getFirstSync.mockImplementation((statement: string) => {
    if (statement.includes("FROM sync_outbox")) {
      return { count: 0 };
    }
    if (statement.includes("FROM sync_failures") && !statement.includes("NOT EXISTS")) {
      return { count: 0 };
    }
    return { error: 0 };
  });
  getAllSync.mockImplementation((statement: string) =>
    statement.startsWith("PRAGMA table_info")
      ? [{ name: "sync_error_message" }]
      : []
  );
});

describe("sync status catalog identifiers", () => {
  it("counts catalog errors using id and visit errors using local_id", () => {
    expect(() => getSyncCounts()).not.toThrow();

    const statements = getFirstSync.mock.calls.map(([statement]) => String(statement));
    expect(statements).toContainEqual(expect.stringContaining("productores.id"));
    expect(statements).toContainEqual(expect.stringContaining("sectores.id"));
    expect(statements).toContainEqual(expect.stringContaining("subsectores.id"));
    expect(statements).toContainEqual(expect.stringContaining("parcelas.id"));
    expect(statements).toContainEqual(
      expect.stringContaining("visitas_campo.local_id")
    );
    expect(statements.some((statement) => statement.includes("productores.local_id"))).toBe(
      false
    );
  });

  it("loads catalog error details without selecting a missing local_id column", () => {
    expect(() => getSyncErrorDetails()).not.toThrow();

    const statements = getAllSync.mock.calls.map(([statement]) => String(statement));
    expect(statements).toContainEqual(
      expect.stringContaining("id AS local_id")
    );
    expect(statements).toContainEqual(
      expect.stringContaining("local_id AS local_id")
    );
    expect(statements.some((statement) => statement.includes("productores.local_id"))).toBe(
      false
    );
  });
});
