import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn<(statement: string, ...params: unknown[]) => { changes: number }>().mockReturnValue({ changes: 1 }),
  withTransactionSync: vi.fn((cb: () => void) => cb())
}));

vi.mock("../../../shared/database/connection", () => ({ getDatabase: () => database }));
vi.mock("../../../shared/database/sync-outbox", () => ({ insertSyncOutboxEntry: vi.fn() }));
vi.mock("../../../shared/utils/local-id", () => ({ generateLocalId: vi.fn(() => "local-1") }));

import { observacionesSanitariasRepository } from "./observaciones-sanitarias.repository";

const obsRow = {
  local_id: "o1", server_id: "srv-1", visita_local_id: "v1", pest_disease_id: "pd1",
  incidence_level_id: "l1", severity_level_id: null, incidence_percentage: "50",
  observation: null, sync_status: "synced" as const, created_at: "2026-01-01", updated_at: "2026-01-01"
};

describe("observacionesSanitariasRepository", () => {
  beforeEach(() => { vi.clearAllMocks(); database.getAllSync.mockReturnValue([]); database.getFirstSync.mockReturnValue(null); database.withTransactionSync.mockImplementation((cb: () => void) => cb()); });

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

      expect(Number(observacionesSanitariasRepository.getById("o1")?.incidencePercentage)).toBe(50);
    });
  });
});
