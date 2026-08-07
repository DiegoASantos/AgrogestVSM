import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn<(statement: string, ...params: unknown[]) => { changes: number }>().mockReturnValue({ changes: 1 })
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));

import { subsectoresRepository } from "./subsectores.repository";

const row = {
  id: "sub1", public_id: "pub-sub1", sector_id: "sec1", name: "Subsector Norte A",
  description: null, is_active: 1, created_at: "2026-01-01", updated_at: "2026-01-01",
  server_id: "srv-1", sync_status: "synced" as const, sync_error_message: null
};

function sqlOf(calls: unknown[]): string[] {
  return calls.map((c) => String((c as unknown[])[0] ?? ""));
}

describe("subsectoresRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.getFirstSync.mockReturnValue(null);
  });

  describe("#getAll", () => {
    it("should query all subsectores", () => {
      database.getAllSync.mockReturnValue([row] as never);

      const result = subsectoresRepository.getAll();

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("FROM subsectores"))).toBe(true);
      expect(result[0].name).toBe("Subsector Norte A");
    });
  });

  describe("#getBySectorId", () => {
    it("should filter by sector_id", () => {
      database.getAllSync.mockReturnValue([row] as never);

      subsectoresRepository.getBySectorId("sec1");

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("WHERE sector_id = ?"))).toBe(true);
    });
  });

  describe("#getByProductorAndSector", () => {
    it("should query via parcelas join", () => {
      database.getAllSync.mockReturnValue([row] as never);

      subsectoresRepository.getByProductorAndSector("prod1", "sec1");

      const stmts = sqlOf(database.getAllSync.mock.calls);
      expect(stmts.some((s) => s.includes("INNER JOIN parcelas"))).toBe(true);
      expect(stmts.some((s) => s.includes("parcelas.productor_id"))).toBe(true);
    });
  });

  describe("#getById", () => {
    it("should find by id", () => {
      database.getFirstSync.mockReturnValue(row);

      expect(subsectoresRepository.getById("sub1")?.name).toBe("Subsector Norte A");
    });

    it("should return null when not found", () => {
      expect(subsectoresRepository.getById("x")).toBeNull();
    });
  });

  describe("#insert", () => {
    it("should insert with all fields", () => {
      subsectoresRepository.insert({
        id: "sub2", publicId: "pub-2", sectorId: "sec2", name: "Sur",
        description: null, isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-01",
        serverId: null, syncStatus: "pending" as const, syncErrorMessage: null
      });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("INSERT INTO subsectores"))).toBe(true);
    });
  });

  describe("#update", () => {
    it("should update syncStatus", () => {
      subsectoresRepository.update("sub1", { syncStatus: "synced", serverId: "srv-2" });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("UPDATE subsectores"))).toBe(true);
    });
  });
});
