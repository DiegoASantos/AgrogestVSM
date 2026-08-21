import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi
    .fn<(statement: string, ...params: unknown[]) => { changes: number }>()
    .mockReturnValue({ changes: 1 }),
  withTransactionSync: vi.fn((cb: () => void) => cb())
}));

vi.mock("../../../shared/database/connection", () => ({ getDatabase: () => database }));
vi.mock("../../../shared/database/sync-outbox", () => ({
  insertSyncOutboxEntry: vi.fn()
}));
vi.mock("../../../shared/utils/local-id", () => ({
  generateLocalId: vi.fn(() => "local-1")
}));

import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { observacionesSanitariasRepository } from "./observaciones-sanitarias.repository";

const obsRow = {
  local_id: "o1",
  server_id: "srv-1",
  visita_local_id: "v1",
  pest_disease_id: "pd1",
  incidence_level_id: "l1",
  severity_level_id: null,
  incidence_percentage: "50",
  observation: null,
  sync_status: "synced" as const,
  created_at: "2026-01-01",
  updated_at: "2026-01-01"
};

describe("observacionesSanitariasRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.getFirstSync.mockReturnValue(null);
    database.withTransactionSync.mockImplementation((cb: () => void) => cb());
  });

  describe("#getByVisitaLocalId", () => {
    it("should query observaciones by visita", () => {
      database.getAllSync.mockReturnValue([obsRow] as never);

      const result = observacionesSanitariasRepository.getByVisitaLocalId("v1");

      expect(result).toHaveLength(1);
      expect(result[0].pestDiseaseId).toBe("pd1");
    });
  });

  describe("#getById", () => {
    it("should find observacion by localId", () => {
      database.getFirstSync.mockReturnValue(obsRow);

      expect(
        Number(observacionesSanitariasRepository.getById("o1")?.incidencePercentage)
      ).toBe(50);
    });
  });

  describe("#deleteById", () => {
    it("cancels a local create without leaving a remote delete", () => {
      database.getFirstSync.mockReturnValue({ ...obsRow, server_id: null });

      observacionesSanitariasRepository.deleteById("o1");

      expect(insertSyncOutboxEntry).toHaveBeenCalledWith(
        database,
        expect.objectContaining({
          entityType: "visita_observaciones_sanitarias",
          entityLocalId: "o1",
          operation: "delete",
          payload: null
        })
      );
    });

    it("preserves the remote identity and sanitary target in a durable delete", () => {
      database.getFirstSync.mockReturnValue(obsRow);

      observacionesSanitariasRepository.deleteById("o1");

      expect(insertSyncOutboxEntry).toHaveBeenCalledWith(
        database,
        expect.objectContaining({
          operation: "delete",
          payload: JSON.stringify({
            serverId: "srv-1",
            visitaId: "v1",
            pestDiseaseId: "pd1"
          })
        })
      );
    });
  });

  describe("#getLocallyDeletedPestDiseaseIds", () => {
    it("reads only delete tombstones for the requested visit and current owner", () => {
      database.getFirstSync.mockReturnValue({ value: "agronomo-1" });
      database.getAllSync
        .mockReturnValueOnce([
          { payload: '{"visitaId":"v1","pestDiseaseId":"pd1"}' },
          { payload: '{"visitaId":"v2","pestDiseaseId":"pd2"}' }
        ] as never)
        .mockReturnValueOnce([
          { payload: '{"visitaId":"v1","pestDiseaseId":"pd3"}' },
          { payload: "invalid-json" }
        ] as never)
        .mockReturnValueOnce([{ pest_disease_id: "pd3" }] as never);

      expect([
        ...observacionesSanitariasRepository.getLocallyDeletedPestDiseaseIds("v1")
      ]).toEqual(["pd1"]);
      expect(database.getAllSync).toHaveBeenCalledTimes(3);
      const calls = database.getAllSync.mock.calls as unknown as unknown[][];
      expect(calls[0]?.[1]).toBe("agronomo-1");
      expect(calls[1]?.[1]).toBe("agronomo-1");
      expect(calls[2]?.[1]).toBe("v1");
    });
  });
});
