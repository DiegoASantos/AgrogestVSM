import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn<(statement: string, ...params: unknown[]) => { changes: number }>().mockReturnValue({ changes: 1 })
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));

import { productoresRepository } from "./productores.repository";

const row = {
  id: "prod1", public_id: "pub-prod1", entity_type: "persona" as const,
  document_type_id: 1, document_number: "12345678", first_name: "Juan",
  last_name: "Perez", phone: null, email: null, address: null, is_active: 1,
  created_at: "2026-01-01", updated_at: "2026-01-01", server_id: "srv-1",
  sync_status: "synced" as const, sync_error_message: null
};

function sqlOf(calls: unknown[]): string[] {
  return calls.map((c) => String((c as unknown[])[0] ?? ""));
}

describe("productoresRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.getFirstSync.mockReturnValue(null);
  });

  describe("#getAll", () => {
    it("should query active productores", () => {
      database.getAllSync.mockReturnValue([row] as never);

      const result = productoresRepository.getAll();

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("WHERE is_active = 1"))).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Juan");
    });
  });

  describe("#searchByName", () => {
    it("should search with case-insensitive LIKE", () => {
      database.getAllSync.mockReturnValue([row] as never);

      productoresRepository.searchByName("juan", 10, 0);

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("LIMIT ?"))).toBe(true);
    });
  });

  describe("#countByName", () => {
    it("should return total count", () => {
      database.getFirstSync.mockReturnValue({ total: 5 });

      const result = productoresRepository.countByName("juan");

      expect(result).toBe(5);
    });

    it("should return 0 when no results", () => {
      expect(productoresRepository.countByName("x")).toBe(0);
    });
  });

  describe("#getById", () => {
    it("should find productor by id", () => {
      database.getFirstSync.mockReturnValue(row);

      expect(productoresRepository.getById("prod1")?.id).toBe("prod1");
    });

    it("should return null when not found", () => {
      expect(productoresRepository.getById("x")).toBeNull();
    });
  });

  describe("#getBySectorId", () => {
    it("should filter by sector via parcelas join", () => {
      database.getAllSync.mockReturnValue([row] as never);

      productoresRepository.getBySectorId("sec1");

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("INNER JOIN subsectores"))).toBe(true);
    });
  });

  describe("#insert", () => {
    it("should insert with all fields", () => {
      productoresRepository.insert({
        id: "prod2", publicId: "pub-2", entityType: "persona" as const,
        documentTypeId: 1, documentNumber: "87654321", firstName: "Maria",
        lastName: "Garcia", phone: null, email: null, address: null, isActive: true,
        createdAt: "2026-01-01", updatedAt: "2026-01-01", serverId: null,
        syncStatus: "pending" as const, syncErrorMessage: null
      });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("INSERT INTO productores"))).toBe(true);
    });
  });

  describe("#update", () => {
    it("should update syncStatus and serverId", () => {
      productoresRepository.update("prod1", { serverId: "srv-2", syncStatus: "synced" });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("UPDATE productores"))).toBe(true);
    });
  });
});
