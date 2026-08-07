import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn<(statement: string, ...params: unknown[]) => { changes: number }>().mockReturnValue({ changes: 1 })
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));

import { sectoresRepository } from "./sectores.repository";

const row = {
  id: "sec1", public_id: "pub-sec1", distrito_id: "1", name: "Sector Norte",
  description: null, is_active: 1, created_at: "2026-01-01", updated_at: "2026-01-01",
  server_id: "srv-1", sync_status: "synced" as const, sync_error_message: null
};

function sqlOf(calls: unknown[]): string[] {
  return calls.map((c) => String((c as unknown[])[0] ?? ""));
}

describe("sectoresRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.getFirstSync.mockReturnValue(null);
  });

  describe("#getAll", () => {
    it("should query all sectores ordered by name", () => {
      database.getAllSync.mockReturnValue([row] as never);

      const result = sectoresRepository.getAll();

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("ORDER BY name ASC"))).toBe(true);
      expect(result[0].name).toBe("Sector Norte");
    });
  });

  describe("#getById", () => {
    it("should find sector by id", () => {
      database.getFirstSync.mockReturnValue(row);

      expect(sectoresRepository.getById("sec1")?.name).toBe("Sector Norte");
    });

    it("should return null when not found", () => {
      expect(sectoresRepository.getById("x")).toBeNull();
    });
  });

  describe("#getByProductorId", () => {
    it("should query via parcelas + subsectores join", () => {
      database.getAllSync.mockReturnValue([row] as never);

      sectoresRepository.getByProductorId("prod1");

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("INNER JOIN subsectores"))).toBe(true);
      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("parcelas.productor_id"))).toBe(true);
    });
  });

  describe("#getByDistritoId", () => {
    it("should filter by distrito_id", () => {
      database.getAllSync.mockReturnValue([row] as never);

      sectoresRepository.getByDistritoId("1");

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("WHERE distrito_id = ?"))).toBe(true);
    });
  });

  describe("#insert", () => {
    it("should insert with all fields", () => {
      sectoresRepository.insert({
        id: "sec2", publicId: "pub-2", distritoId: "2", name: "Sur",
        description: null, isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-01",
        serverId: null, syncStatus: "pending" as const, syncErrorMessage: null
      });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("INSERT INTO sectores"))).toBe(true);
    });
  });

  describe("#update", () => {
    it("should update syncStatus", () => {
      sectoresRepository.update("sec1", { syncStatus: "synced" });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("UPDATE sectores"))).toBe(true);
    });
  });
});
