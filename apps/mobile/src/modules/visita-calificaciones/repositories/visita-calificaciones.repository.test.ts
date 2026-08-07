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

import { visitaCalificacionesRepository } from "./visita-calificaciones.repository";

const calRow = {
  local_id: "c1", server_id: "srv-1", visita_local_id: "v1", modulo: "plagas" as const,
  puntaje: 3, observacion: null, justificado: null, categoria_justificacion: null,
  motivo_justificacion: null, sync_status: "synced" as const, sync_error_message: null,
  created_at: "2026-01-01", updated_at: "2026-01-01"
};

describe("visitaCalificacionesRepository", () => {
  beforeEach(() => { vi.clearAllMocks(); database.getAllSync.mockReturnValue([]); database.getFirstSync.mockReturnValue(null); database.withTransactionSync.mockImplementation((cb: () => void) => cb()); });

  describe("#getById", () => {
    it("should find calificacion by localId", () => {
      database.getFirstSync.mockReturnValue(calRow);

      expect(visitaCalificacionesRepository.getById("c1")?.modulo).toBe("plagas");
    });

    it("should return null when not found", () => {
      database.getFirstSync.mockReturnValue(null);
      expect(visitaCalificacionesRepository.getById("x")).toBeNull();
    });
  });

  describe("#getByVisitaLocalId", () => {
    it("should query calificaciones by visita ordered by modulo", () => {
      database.getAllSync.mockReturnValue([calRow] as never);

      const result = visitaCalificacionesRepository.getByVisitaLocalId("v1");

      expect(result).toHaveLength(1);
      expect(result[0].puntaje).toBe(3);
    });
  });

  describe("#getByVisitaAndModulo", () => {
    it("should find by visita and modulo", () => {
      database.getFirstSync.mockReturnValue(calRow);

      const result = visitaCalificacionesRepository.getByVisitaAndModulo("v1", "plagas");

      expect(result?.puntaje).toBe(3);
    });
  });
});
