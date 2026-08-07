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

import { evaluacionesRepository } from "./evaluaciones.repository";

const evalRow = {
  local_id: "e1", server_id: "srv-1", visita_local_id: "v1", nutrient_id: "n1",
  sort_order: 1, incidence_percentage: "25", percentage: null, description: "Test",
  organos_afectados: null, sync_status: "synced" as const, created_at: "2026-01-01", updated_at: "2026-01-01"
};

describe("evaluacionesRepository", () => {
  beforeEach(() => { vi.clearAllMocks(); database.getAllSync.mockReturnValue([]); database.getFirstSync.mockReturnValue(null); database.withTransactionSync.mockImplementation((cb: () => void) => cb()); });

  describe("#getAll", () => {
    it("should query all evaluaciones ordered by created_at DESC", () => {
      database.getAllSync.mockReturnValue([evalRow] as never);

      const result = evaluacionesRepository.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Test");
    });
  });

  describe("#getById", () => {
    it("should find evaluacion by localId", () => {
      database.getFirstSync.mockReturnValue(evalRow);

      expect(evaluacionesRepository.getById("e1")?.nutrientId).toBe("n1");
    });

    it("should return null when not found", () => {
      database.getFirstSync.mockReturnValue(null);
      expect(evaluacionesRepository.getById("x")).toBeNull();
    });
  });

  describe("#getByVisitaLocalId", () => {
    it("should query evaluaciones by visita ordered by sort_order", () => {
      database.getAllSync.mockReturnValue([evalRow] as never);

      const result = evaluacionesRepository.getByVisitaLocalId("v1");

      expect(result).toHaveLength(1);
      expect(result[0].order).toBe(1);
    });
  });
});
