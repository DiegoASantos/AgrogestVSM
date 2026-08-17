import { beforeEach, describe, expect, it, vi } from "vitest";

const runSync = vi.fn();
const getFirstSync = vi.fn();
const withTransactionSync = vi.fn((task: () => void) => task());

vi.mock("../database/connection", () => ({
  getDatabase: () => ({ runSync, getFirstSync, withTransactionSync })
}));
vi.mock("../database/catalog-session", () => ({
  getCatalogSessionUserId: () => "agronomo-1"
}));
vi.mock("../database/sqlite-utils", () => ({
  getNowIsoString: () => "2026-08-16T20:00:00.000Z"
}));
vi.mock("./sync-events", () => ({ notifySyncStatusChanged: vi.fn() }));
vi.mock("./sync-requests", () => ({ scheduleSync: vi.fn() }));

const { discardUnsyncedCatalogFailure, retryCatalogSyncFailure } =
  await import("./catalog-sync-recovery");

describe("catalog sync recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFirstSync.mockImplementation((sql: string) =>
      sql.includes("FROM sync_failures") ? { id: 1 } : { server_id: null }
    );
  });

  it("requeues a permanent fertilizer failure using its local identity", () => {
    retryCatalogSyncFailure("fertilizantes", "fert-local-1");

    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_outbox"),
      "agronomo-1",
      "fertilizantes",
      "fert-local-1",
      "create",
      "2026-08-16T20:00:00.000Z"
    );
  });

  it("discards only an unconfirmed local fertilizer and its sync metadata", () => {
    discardUnsyncedCatalogFailure("fertilizantes", "fert-local-1");

    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM fertilizantes"),
      "fert-local-1"
    );
    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sync_failures"),
      "agronomo-1",
      "fertilizantes",
      "fert-local-1"
    );
  });

  it("refuses to discard a catalog row that already has a server id", () => {
    getFirstSync.mockImplementation((sql: string) =>
      sql.includes("FROM sync_failures") ? { id: 1 } : { server_id: "77" }
    );

    expect(() => discardUnsyncedCatalogFailure("fertilizantes", "fert-local-1")).toThrow(
      "debe desactivarse por un administrador"
    );
    expect(runSync).not.toHaveBeenCalled();
  });

  it("refuses to discard an ingredient required by a pending brand", () => {
    getFirstSync.mockImplementation((sql: string) => {
      if (sql.includes("FROM sync_failures")) return { id: 1 };
      if (sql.includes("FROM marcas_producto")) return { id: "marca-local-1" };
      return { server_id: null };
    });

    expect(() =>
      discardUnsyncedCatalogFailure("ingredientes_activos", "ingrediente-local-1")
    ).toThrow("una marca pendiente depende");
  });

  it("rejects recovery when the durable failure is not owned by the active session", () => {
    getFirstSync.mockReturnValue(null);

    expect(() => retryCatalogSyncFailure("fertilizantes", "fert-local-1")).toThrow(
      "no pertenece a la sesion activa"
    );
    expect(runSync).not.toHaveBeenCalled();
  });

  it("cleans owned sync metadata when the local row was already removed", () => {
    getFirstSync.mockImplementation((sql: string) =>
      sql.includes("FROM sync_failures") ? { id: 1 } : null
    );

    discardUnsyncedCatalogFailure("fertilizantes", "fert-local-1");

    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sync_failures"),
      "agronomo-1",
      "fertilizantes",
      "fert-local-1"
    );
  });
});
