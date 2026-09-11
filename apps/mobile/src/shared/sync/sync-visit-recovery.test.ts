import { beforeEach, describe, expect, it, vi } from "vitest";

const notifySyncStatusChanged = vi.fn();

vi.mock("../database/connection", () => ({
  getDatabase: vi.fn()
}));

vi.mock("../database/sqlite-utils", () => ({
  getNowIsoString: () => "2026-09-10T16:00:00.000Z"
}));

vi.mock("./sync-events", () => ({
  notifySyncStatusChanged: (...args: unknown[]) => notifySyncStatusChanged(...args)
}));

import { enqueueVisitaUpdateRepairOnce } from "./sync-visit-recovery";

const database = {
  getFirstSync: vi.fn(),
  getAllSync: vi.fn(),
  runSync: vi.fn(),
  withTransactionSync: vi.fn((task: () => void) => task())
};

describe("enqueueVisitaUpdateRepairOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getFirstSync.mockImplementation((_query: string, key: string) =>
      key === "catalog_session_user_id" ? { value: "agronomo-1" } : null
    );
    database.getAllSync.mockReturnValue([
      { local_id: "visita-1" },
      { local_id: "visita-2" }
    ]);
  });

  it("queues server-backed visits atomically and writes the marker last", () => {
    const queued = enqueueVisitaUpdateRepairOnce(database as never);

    expect(queued).toBe(2);
    const statements = database.runSync.mock.calls.map(([query]) => String(query));
    expect(
      statements.filter((query) => query.includes("INSERT INTO sync_outbox"))
    ).toHaveLength(2);
    expect(
      statements.filter((query) => query.includes("UPDATE visitas_campo"))
    ).toHaveLength(2);
    expect(statements.at(-1)).toContain("INSERT OR REPLACE INTO app_meta");
    expect(notifySyncStatusChanged).toHaveBeenCalledOnce();
  });

  it("does not run the repair again when the per-user marker exists", () => {
    database.getFirstSync.mockImplementation((_query: string, key: string) =>
      key === "catalog_session_user_id"
        ? { value: "agronomo-1" }
        : { value: "2026-09-10T16:00:00.000Z" }
    );

    expect(enqueueVisitaUpdateRepairOnce(database as never)).toBe(0);
    expect(database.getAllSync).not.toHaveBeenCalled();
    expect(database.runSync).not.toHaveBeenCalled();
    expect(notifySyncStatusChanged).not.toHaveBeenCalled();
  });

  it("selects only active visits owned by the session and preserves queue and failures", () => {
    enqueueVisitaUpdateRepairOnce(database as never);

    const [query, ...parameters] = database.getAllSync.mock.calls[0] as unknown[];
    expect(String(query)).toContain("visita.agronomist_user_id = ?");
    expect(String(query)).toContain("visita.is_active = 1");
    expect(String(query)).toContain("visita.server_id IS NOT NULL");
    expect(String(query)).toContain("visita.sync_status <> 'error'");
    expect(String(query)).toContain("FROM sync_outbox AS pending");
    expect(String(query)).toContain("FROM sync_failures AS failure");
    expect(parameters).toEqual(["agronomo-1", "agronomo-1", "agronomo-1"]);
  });
});
