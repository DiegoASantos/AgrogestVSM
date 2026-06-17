/**
 * Orchestration tests for processOutbox.
 *
 * sync-engine imports expo-sqlite transitively through the repositories and
 * the database connection module. We stub every module boundary it touches so
 * the test runs in plain Node.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mocks --------------------------------------------------------------

const getPendingOutboxEntries = vi.fn();
const deleteOutboxEntry = vi.fn();
const incrementOutboxRetryCount = vi.fn();

vi.mock("../database/sync-outbox", () => ({
  getPendingOutboxEntries: (...args: unknown[]) => getPendingOutboxEntries(...args),
  deleteOutboxEntry: (...args: unknown[]) => deleteOutboxEntry(...args),
  incrementOutboxRetryCount: (...args: unknown[]) => incrementOutboxRetryCount(...args)
}));

const runSync = vi.fn();
vi.mock("../database/connection", () => ({
  getDatabase: () => ({ runSync })
}));

vi.mock("../database/sqlite-utils", () => ({
  getNowIsoString: () => "2025-04-12T00:00:00.000Z"
}));

const getApiToken = vi.fn();
vi.mock("../services/api/auth-store", () => ({
  getApiToken: () => getApiToken()
}));

vi.mock("../services/api/errors", async () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public readonly statusCode?: number,
      public readonly details?: unknown,
      public readonly responseData?: unknown
    ) {
      super(message);
      this.name = "ApiError";
    }
  }
  return {
    ApiError,
    toApiError(error: unknown) {
      if (error instanceof ApiError) return error;
      if (error instanceof Error) return new ApiError(error.message);
      return new ApiError("Unexpected API error.");
    }
  };
});

vi.mock("../services", async () => {
  const errors = await import("../services/api/errors");
  return errors;
});

vi.mock("../utils/debug-log", () => ({
  debugLog: vi.fn()
}));

const setLastSyncTime = vi.fn();
vi.mock("./sync-status", () => ({
  setLastSyncTime: (...args: unknown[]) => setLastSyncTime(...args)
}));

// Repository mocks
const visitasCampoUpdate = vi.fn();
vi.mock("../../modules/visitas-campo/repositories/visitas-campo.repository", () => ({
  visitasCampoRepository: { update: visitasCampoUpdate }
}));

const evaluacionesUpdate = vi.fn();
const evaluacionesGetById = vi.fn();
vi.mock("../../modules/evaluaciones/repositories/evaluaciones.repository", () => ({
  evaluacionesRepository: {
    update: evaluacionesUpdate,
    getById: evaluacionesGetById
  }
}));

const observacionesUpdate = vi.fn();
const observacionesGetById = vi.fn();
vi.mock(
  "../../modules/observaciones-sanitarias/repositories/observaciones-sanitarias.repository",
  () => ({
    observacionesSanitariasRepository: {
      update: observacionesUpdate,
      getById: observacionesGetById
    }
  })
);

const visitaStepNotesUpdate = vi.fn();
const visitaStepNotesGetById = vi.fn();
vi.mock(
  "../../modules/observaciones-sanitarias/repositories/visita-step-notes.repository",
  () => ({
    visitaStepNotesRepository: {
      update: visitaStepNotesUpdate,
      getById: visitaStepNotesGetById
    }
  })
);

const riegosUpdate = vi.fn();
const riegosGetById = vi.fn();
vi.mock("../../modules/riegos/repositories/riegos.repository", () => ({
  riegosRepository: {
    update: riegosUpdate,
    getById: riegosGetById
  }
}));

const laboresCulturalesUpdate = vi.fn();
const laboresCulturalesGetById = vi.fn();
vi.mock(
  "../../modules/labores-culturales-visita/repositories/labores-culturales-visita.repository",
  () => ({
    laboresCulturalesVisitaRepository: {
      update: laboresCulturalesUpdate,
      getById: laboresCulturalesGetById
    }
  })
);

const handlerVisita = vi.fn();
const handlerEvaluacion = vi.fn();
vi.mock("./sync-handlers", () => ({
  entityHandlerMap: {
    visitas_campo: (entry: unknown) => handlerVisita(entry),
    visita_evaluaciones: (entry: unknown) => handlerEvaluacion(entry)
    // Intentionally omits some entity types to test orphan handling.
  }
}));

// ---- Imports after mocks ------------------------------------------------

const { processOutbox } = await import("./sync-engine");
const { ApiError } = await import("../services/api/errors");

// ---- Helpers ------------------------------------------------------------

type Entry = {
  id: number;
  entityType: string;
  entityLocalId: string;
  operation: "create" | "update" | "delete";
  payload: string | null;
  retryCount: number;
  createdAt: string;
};

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    entityType: "visitas_campo",
    entityLocalId: "local-1",
    operation: "create",
    payload: null,
    retryCount: 0,
    createdAt: "2025-04-12T00:00:00.000Z",
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getApiToken.mockReturnValue("token-xyz");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Tests --------------------------------------------------------------

describe("processOutbox", () => {
  it("returns zeroed counters and does not touch the outbox when no token is set", async () => {
    getApiToken.mockReturnValue(null);
    getPendingOutboxEntries.mockReturnValue([]);

    const result = await processOutbox();

    expect(result).toEqual({ processed: 0, skipped: 0, errors: 0 });
    expect(getPendingOutboxEntries).not.toHaveBeenCalled();
    expect(setLastSyncTime).not.toHaveBeenCalled();
  });

  it("returns zeroed counters and still advances lastSyncTime when outbox is empty", async () => {
    getPendingOutboxEntries.mockReturnValue([]);

    const result = await processOutbox();

    expect(result).toEqual({ processed: 0, skipped: 0, errors: 0 });
    expect(setLastSyncTime).toHaveBeenCalledOnce();
  });

  it("deletes orphaned entries whose entity type has no handler", async () => {
    getPendingOutboxEntries.mockReturnValue([
      makeEntry({ id: 7, entityType: "unknown_type" as never })
    ]);

    const result = await processOutbox();

    expect(deleteOutboxEntry).toHaveBeenCalledWith(7);
    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(0);
  });

  it("removes the entry and counts as processed on synced result", async () => {
    getPendingOutboxEntries.mockReturnValue([makeEntry({ id: 1 })]);
    handlerVisita.mockResolvedValue({ status: "synced" });

    const result = await processOutbox();

    expect(handlerVisita).toHaveBeenCalledOnce();
    expect(deleteOutboxEntry).toHaveBeenCalledWith(1);
    expect(result).toEqual({ processed: 1, skipped: 0, errors: 0 });
  });

  it("removes the entry on deleted_local result", async () => {
    getPendingOutboxEntries.mockReturnValue([makeEntry({ id: 2, operation: "delete" })]);
    handlerVisita.mockResolvedValue({ status: "deleted_local" });

    const result = await processOutbox();

    expect(deleteOutboxEntry).toHaveBeenCalledWith(2);
    expect(result.processed).toBe(1);
  });

  it("counts skipped when the handler reports skipped", async () => {
    getPendingOutboxEntries.mockReturnValue([makeEntry()]);
    handlerVisita.mockResolvedValue({ status: "skipped" });

    const result = await processOutbox();

    expect(deleteOutboxEntry).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it("increments retry and skips on transient error below MAX_RETRIES", async () => {
    getPendingOutboxEntries.mockReturnValue([makeEntry({ id: 3, retryCount: 1 })]);
    handlerVisita.mockRejectedValue(new ApiError("timeout", 503));

    const result = await processOutbox();

    expect(incrementOutboxRetryCount).toHaveBeenCalledWith(3);
    expect(deleteOutboxEntry).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, skipped: 1, errors: 0 });
  });

  it("marks entity as error, deletes the entry, and increments errors after MAX_RETRIES", async () => {
    // retryCount = 4 → (4 + 1) >= 5 triggers exhaustion branch
    getPendingOutboxEntries.mockReturnValue([makeEntry({ id: 4, retryCount: 4 })]);
    handlerVisita.mockRejectedValue(new ApiError("still down", 500));

    const result = await processOutbox();

    expect(incrementOutboxRetryCount).toHaveBeenCalledWith(4);
    expect(visitasCampoUpdate).toHaveBeenCalledWith(
      "local-1",
      expect.objectContaining({ syncStatus: "error" })
    );
    expect(runSync).toHaveBeenCalled();
    expect(deleteOutboxEntry).toHaveBeenCalledWith(4);
    expect(result).toEqual({ processed: 0, skipped: 0, errors: 1 });
  });

  it("stops immediately on auth error and does not advance lastSyncTime", async () => {
    getPendingOutboxEntries.mockReturnValue([
      makeEntry({ id: 10 }),
      makeEntry({ id: 11 })
    ]);
    handlerVisita.mockRejectedValue(new ApiError("unauthorized", 401));

    const result = await processOutbox();

    // Only the first entry was attempted, nothing deleted
    expect(handlerVisita).toHaveBeenCalledTimes(1);
    expect(deleteOutboxEntry).not.toHaveBeenCalled();
    expect(setLastSyncTime).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, skipped: 0, errors: 0 });
  });

  it("resolves a conflict by adopting the server id and counts as processed", async () => {
    getPendingOutboxEntries.mockReturnValue([makeEntry({ id: 5 })]);
    handlerVisita.mockRejectedValue(
      new ApiError("conflict", 409, undefined, {
        id: "server-uuid",
        publicId: "pub-1"
      })
    );

    const result = await processOutbox();

    expect(visitasCampoUpdate).toHaveBeenCalledWith(
      "local-1",
      expect.objectContaining({
        serverId: "server-uuid",
        syncStatus: "synced",
        publicId: "pub-1"
      })
    );
    expect(deleteOutboxEntry).toHaveBeenCalledWith(5);
    expect(result).toEqual({ processed: 1, skipped: 0, errors: 0 });
  });

  it("treats a non-retryable permanent error as error and marks the entity", async () => {
    getPendingOutboxEntries.mockReturnValue([makeEntry({ id: 6 })]);
    handlerVisita.mockRejectedValue(new ApiError("bad request", 400));

    const result = await processOutbox();

    expect(visitasCampoUpdate).toHaveBeenCalledWith(
      "local-1",
      expect.objectContaining({ syncStatus: "error" })
    );
    expect(deleteOutboxEntry).toHaveBeenCalledWith(6);
    expect(result).toEqual({ processed: 0, skipped: 0, errors: 1 });
  });

  it("skips child create entries when their parent visita already failed this cycle", async () => {
    // Parent visita fails transiently (adds to failedVisitaIds)
    // Child evaluacion create referencing that same local visita must be skipped.
    evaluacionesGetById.mockReturnValue({ visitaId: "local-1" });

    getPendingOutboxEntries.mockReturnValue([
      makeEntry({ id: 20, entityType: "visitas_campo", entityLocalId: "local-1" }),
      makeEntry({
        id: 21,
        entityType: "visita_evaluaciones",
        entityLocalId: "eval-1",
        operation: "create"
      })
    ]);
    handlerVisita.mockRejectedValue(new ApiError("network", 503));

    const result = await processOutbox();

    // Parent skipped (transient, retry bumped), child also skipped (not even handled)
    expect(handlerEvaluacion).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, skipped: 2, errors: 0 });
  });

  it("does not skip child entries whose parent visita is not part of the failed set", async () => {
    evaluacionesGetById.mockReturnValue({ visitaId: "other-visita" });

    getPendingOutboxEntries.mockReturnValue([
      makeEntry({
        id: 30,
        entityType: "visita_evaluaciones",
        entityLocalId: "eval-1",
        operation: "create"
      })
    ]);
    handlerEvaluacion.mockResolvedValue({ status: "synced" });

    const result = await processOutbox();

    expect(handlerEvaluacion).toHaveBeenCalledOnce();
    expect(deleteOutboxEntry).toHaveBeenCalledWith(30);
    expect(result.processed).toBe(1);
  });
});
