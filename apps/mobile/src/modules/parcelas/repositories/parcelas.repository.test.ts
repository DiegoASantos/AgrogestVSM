import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn<(statement: string, ...params: unknown[]) => { changes: number }>().mockReturnValue({ changes: 1 })
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));

import { parcelasRepository } from "./parcelas.repository";

const row = {
  id: "p1", public_id: "pub-p1", productor_id: "prod1", subsector_id: "sub1",
  sector_id: "sec1", code: "P-001", name: "Parcela Norte", area_hectares: "2.5",
  description: null, reference_point: '{"type":"Point","coordinates":[-77,-12]}',
  geometry: null, is_active: 1, created_at: "2026-01-01", updated_at: "2026-01-01",
  server_id: "srv-1", sync_status: "synced" as const, sync_error_message: null
};

function sqlOf(calls: unknown[]): string[] {
  return calls.map((c) => String((c as unknown[])[0] ?? ""));
}

describe("parcelasRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.getFirstSync.mockReturnValue(null);
  });

  describe("#getAll", () => {
    it("should query all parcelas with subsector join", () => {
      database.getAllSync.mockReturnValue([row] as never);

      const result = parcelasRepository.getAll();

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("INNER JOIN subsectores"))).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("P-001");
      expect(result[0].isActive).toBe(true);
    });

    it("should return empty array when no parcelas", () => {
      expect(parcelasRepository.getAll()).toEqual([]);
    });
  });

  describe("#getById", () => {
    it("should find parcela by id", () => {
      database.getFirstSync.mockReturnValue(row);

      const result = parcelasRepository.getById("p1");

      const call = database.getFirstSync.mock.calls[0] as unknown[];
      expect(String(call[0])).toContain("WHERE parcelas.id = ?");
      expect(call[1]).toBe("p1");
      expect(result?.id).toBe("p1");
    });

    it("should return null when not found", () => {
      expect(parcelasRepository.getById("x")).toBeNull();
    });
  });

  describe("#getDepartmentCodeById", () => {
    it("should query department through geographic hierarchy", () => {
      database.getFirstSync.mockReturnValue({ code: "15" });

      const result = parcelasRepository.getDepartmentCodeById("p1");

      expect(sqlOf(database.getFirstSync.mock.calls).some((s) => s.includes("departamentos.code"))).toBe(true);
      expect(result).toBe("15");
    });

    it("should return null when not found", () => {
      expect(parcelasRepository.getDepartmentCodeById("x")).toBeNull();
    });
  });

  describe("#getBySectorId", () => {
    it("should filter by sector via subsector join", () => {
      database.getAllSync.mockReturnValue([row] as never);

      const result = parcelasRepository.getBySectorId("sec1");

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("subsectores.sector_id"))).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe("#getByProductorId", () => {
    it("should filter by productor_id", () => {
      database.getAllSync.mockReturnValue([row] as never);

      parcelasRepository.getByProductorId("prod1");

      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("parcelas.productor_id"))).toBe(true);
    });
  });

  describe("#insert", () => {
    it("should insert with all fields", () => {
      parcelasRepository.insert({
        id: "p2", publicId: "pub-p2", productorId: "prod1", subsectorId: "sub1",
        sectorId: "sec1", code: "P-002", name: "Sur", areaHectares: "3.0",
        description: null, referencePoint: null, geometry: null, isActive: true,
        createdAt: "2026-01-01", updatedAt: "2026-01-01", serverId: null,
        syncStatus: "pending" as const, syncErrorMessage: null
      });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("INSERT INTO parcelas"))).toBe(true);
    });
  });

  describe("#update", () => {
    it("should update syncStatus and serverId", () => {
      parcelasRepository.update("p1", { serverId: "srv-2", syncStatus: "synced" });

      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("UPDATE parcelas"))).toBe(true);
      expect(sqlOf(database.runSync.mock.calls).some((s) => s.includes("server_id = ?"))).toBe(true);
    });
  });
});
