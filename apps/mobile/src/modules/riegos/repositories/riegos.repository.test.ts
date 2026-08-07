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

import { riegosRepository } from "./riegos.repository";

const riegoRow = {
  local_id: "r1", server_id: "srv-1", visita_local_id: "v1", tipo_riego_id: "t1",
  fuente_agua: "subterranea", tipo_suelo: "arenoso", humedad_suelo: "optimo",
  estres_hidrico: 0, sync_status: "synced" as const, created_at: "2026-01-01", updated_at: "2026-01-01"
};

describe("riegosRepository", () => {
  beforeEach(() => { vi.clearAllMocks(); database.getAllSync.mockReturnValue([]); database.getFirstSync.mockReturnValue(null); database.withTransactionSync.mockImplementation((cb: () => void) => cb()); });

  describe("#getTiposRiego", () => {
    it("should query catalog ordered by name", () => {
      database.getAllSync.mockReturnValue([{ id: "t1", name: "Goteo", description: null, is_active: 1 }] as never);

      const result = riegosRepository.getTiposRiego();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Goteo");
    });
  });

  describe("#getById", () => {
    it("should find riego by localId", () => {
      database.getFirstSync.mockReturnValue(riegoRow);

      expect(riegosRepository.getById("r1")?.fuenteAgua).toBe("subterranea");
    });

    it("should return null when not found", () => {
      database.getFirstSync.mockReturnValue(null);
      expect(riegosRepository.getById("x")).toBeNull();
    });
  });

  describe("#getByVisitaLocalId", () => {
    it("should find riego by visitaLocalId", () => {
      database.getFirstSync.mockReturnValue(riegoRow);

      expect(riegosRepository.getByVisitaLocalId("v1")?.tipoRiegoId).toBe("t1");
    });
  });
});
