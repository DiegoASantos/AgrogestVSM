import { beforeEach, describe, expect, it, vi } from "vitest";

const runSync = vi.fn();
const getAllSync = vi.fn();
const getFirstSync = vi.fn();
const withTransactionSync = vi.fn((callback: () => void) => callback());

vi.mock("./connection", () => ({
  getDatabase: () => ({
    runSync,
    getAllSync,
    getFirstSync,
    withTransactionSync
  })
}));

const notifySyncStatusChanged = vi.fn();
vi.mock("../sync/sync-events", () => ({
  notifySyncStatusChanged
}));

const { retryTransientSyncFailures, storeSyncFailure } = await import(
  "./sync-failures"
);

describe("sync failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFirstSync.mockReturnValue(null);
    getAllSync.mockImplementation((query: string) =>
      query.startsWith("PRAGMA") ? [] : []
    );
  });

  it("stores the complete delete operation for a durable retry", () => {
    const db = { runSync } as never;

    storeSyncFailure(
      db,
      {
        id: 7,
        entityType: "visitas_campo",
        entityLocalId: "local-7",
        operation: "delete",
        payload: JSON.stringify({ serverId: "server-7" }),
        retryCount: 4,
        createdAt: "2026-07-12T00:00:00.000Z"
      },
      "transient",
      "timeout",
      "2026-07-12T00:01:00.000Z"
    );

    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO sync_failures"),
      "visitas_campo",
      "local-7",
      "visitas_campo",
      "local-7",
      "delete",
      JSON.stringify({ serverId: "server-7" }),
      5,
      "transient",
      "timeout",
      "2026-07-12T00:00:00.000Z",
      "2026-07-12T00:01:00.000Z",
      "2026-07-12T00:01:00.000Z"
    );
  });

  it("requeues transient parents before children and preserves payload", () => {
    getAllSync.mockImplementation((query: string) => {
      if (query.includes("FROM sync_failures") && query.includes("error_kind")) {
        return [
          failureRow(1, "visitas_campo", "parent", "delete", "parent-payload"),
          failureRow(
            2,
            "visita_evaluaciones",
            "child",
            "create",
            "child-payload"
          )
        ];
      }

      return [];
    });

    expect(retryTransientSyncFailures()).toBe(2);

    const inserts = runSync.mock.calls.filter(([query]) =>
      String(query).includes("INSERT INTO sync_outbox")
    );
    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.slice(1, 6)).toEqual([
      "visitas_campo",
      "parent",
      "delete",
      "parent-payload",
      "2026-07-12T00:00:00.000Z"
    ]);
    expect(inserts[1]?.slice(1, 6)).toEqual([
      "visita_evaluaciones",
      "child",
      "create",
      "child-payload",
      "2026-07-12T00:00:00.000Z"
    ]);
    expect(notifySyncStatusChanged).toHaveBeenCalledOnce();
  });
});

function failureRow(
  id: number,
  entityType: string,
  entityLocalId: string,
  operation: "create" | "update" | "delete",
  payload: string
) {
  return {
    id,
    entity_type: entityType,
    entity_local_id: entityLocalId,
    operation,
    payload,
    retry_count: 5,
    error_kind: "transient",
    error_message: "timeout",
    outbox_created_at: "2026-07-12T00:00:00.000Z",
    last_attempt_at: "2026-07-12T00:01:00.000Z",
    failed_at: "2026-07-12T00:01:00.000Z"
  };
}
