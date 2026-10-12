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

import {
  enqueueLegacyFrequencyRecovery,
  enqueueVisitaUpdateRepairOnce,
  isLegacyFrequencyRecoveryPayload
} from "./sync-visit-recovery";

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

describe("enqueueLegacyFrequencyRecovery", () => {
  const candidate = {
    failure_id: 7,
    error_message: "Completa la frecuencia de dosis de la mezcla 1.",
    failure_payload: null,
    operation: "create",
    receta_local_id: "receta-1",
    receta_server_id: null,
    visita_local_id: "visita-1",
    visita_server_id: "visita-remota-1",
    start_visit_time: "23:55",
    visita_sync_status: "synced"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([candidate]);
    database.getFirstSync.mockImplementation((query: string, key: string) => {
      if (key === "catalog_session_user_id") return { value: "agronomo-1" };
      if (query.includes("SELECT error_message FROM sync_failures")) {
        return { error_message: candidate.error_message };
      }
      return null;
    });
    database.runSync.mockReturnValue({ changes: 1 });
  });

  it("queues the visit before its recipe and clears only the matching failure", () => {
    expect(enqueueLegacyFrequencyRecovery(database as never)).toBe(1);

    const [query, ownerId, agronomistId] = database.getAllSync.mock.calls[0];
    expect(query).toContain("failure.owner_user_id = ?");
    expect(query).toContain("visita.agronomist_user_id = ?");
    expect(query).toContain("visita.is_active = 1");
    expect([ownerId, agronomistId]).toEqual(["agronomo-1", "agronomo-1"]);

    const statements = database.runSync.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toContain("UPDATE visitas_campo");
    expect(database.runSync.mock.calls[0][1]).toBe("00:05");
    expect(statements[1]).toContain("'visitas_campo'");
    expect(statements[2]).toContain("'visita_recetas'");
    expect(statements[3]).toContain("UPDATE visita_recetas");
    expect(statements[4]).toContain("DELETE FROM sync_failures");
    expect(database.runSync.mock.calls[2][4]).toContain("missing_frequency_v1");
    expect(notifySyncStatusChanged).toHaveBeenCalledOnce();
  });

  it("leaves unrelated errors and already recovered rows untouched", () => {
    database.getAllSync.mockReturnValue([
      { ...candidate, error_message: "Otro error de receta" },
      { ...candidate, failure_payload: '{"recovery":"missing_frequency_v1"}' }
    ]);

    expect(enqueueLegacyFrequencyRecovery(database as never)).toBe(0);
    expect(database.runSync).not.toHaveBeenCalled();
    expect(notifySyncStatusChanged).not.toHaveBeenCalled();
  });

  it("recognizes the recovery payload without accepting malformed JSON", () => {
    expect(isLegacyFrequencyRecoveryPayload('{"recovery":"missing_frequency_v1"}')).toBe(true);
    expect(isLegacyFrequencyRecoveryPayload('{"recovery":"other"}')).toBe(false);
    expect(isLegacyFrequencyRecoveryPayload("{")).toBe(false);
  });
});
