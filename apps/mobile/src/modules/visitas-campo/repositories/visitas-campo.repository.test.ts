import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn<(statement: string, ...params: unknown[]) => { changes: number }>().mockReturnValue({ changes: 1 }),
  withTransactionSync: vi.fn((cb: () => void) => cb())
}));

vi.mock("../../../shared/database/connection", () => ({ getDatabase: () => database }));
vi.mock("../../../shared/database/sync-outbox", () => ({ insertSyncOutboxEntry: vi.fn() }));
vi.mock("../../../shared/utils/local-id", () => ({ generateLocalId: vi.fn(() => "local-1"), generatePublicId: vi.fn(() => "pub-1") }));

import { visitasCampoRepository } from "./visitas-campo.repository";

const visitaRow = {
  local_id: "v1", server_id: "srv-1", public_id: "pub-1", nro_ficha: "F-001",
  crop_id: "c1", variety_id: "var1", parcela_id: "p1", campaign_id: "camp1",
  agronomist_user_id: "u1", plants_count: 100, area_hectares: "2.5",
  sowing_date: "2025-09-01", visit_date: "2026-06-15", start_visit_time: "08:00",
  end_visit_time: "10:30", phenological_stage_id: "stage1", sub_etapa_id: null,
  sub_etapa_percentage: null, general_observation: null, agronomist_signature_name: null,
  producer_signature_name: null, visit_location: null, receta_anterior_json: null,
  synchronized_at: null, sync_error_message: null, is_active: 1, sync_status: "synced" as const,
  created_at: "2026-01-01", updated_at: "2026-01-01"
};

function sqlOf(calls: unknown[]): string[] { return calls.map((c) => String((c as unknown[])[0] ?? "")); }

describe("visitasCampoRepository", () => {
  beforeEach(() => { vi.clearAllMocks(); database.getAllSync.mockReturnValue([]); database.getFirstSync.mockReturnValue(null); database.withTransactionSync.mockImplementation((cb: () => void) => cb()); });

  describe("#getAll", () => {
    it("should query all visitas ordered by date DESC", () => {
      database.getAllSync.mockReturnValue([visitaRow] as never);
      const result = visitasCampoRepository.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].nroFicha).toBe("F-001");
    });
  });

  describe("#getById", () => {
    it("should find visita by localId", () => {
      database.getFirstSync.mockReturnValue(visitaRow);
      expect(visitasCampoRepository.getById("v1")?.nroFicha).toBe("F-001");
    });
    it("should return null when not found", () => {
      database.getFirstSync.mockReturnValue(null);
      expect(visitasCampoRepository.getById("x")).toBeNull();
    });
  });

  describe("#getByParcelaId", () => {
    it("should filter by parcela_id ordered by date DESC", () => {
      database.getAllSync.mockReturnValue([visitaRow] as never);
      const result = visitasCampoRepository.getByParcelaId("p1");
      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("parcela_id"))).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe("#getByAgronomistUserId", () => {
    it("should filter by agronomist_user_id", () => {
      database.getAllSync.mockReturnValue([visitaRow] as never);
      visitasCampoRepository.getByAgronomistUserId("u1");
      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("agronomist_user_id"))).toBe(true);
    });
  });

  describe("#getCultivos", () => {
    it("should query active cultivos ordered by name", () => {
      database.getAllSync.mockReturnValue([{ id: "c1", code: "BAN", name: "Banano", is_active: 1 }] as never);
      const result = visitasCampoRepository.getCultivos();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Banano");
    });
  });

  describe("#getVariedadesByCultivo", () => {
    it("should filter variedades by cultivo_id", () => {
      database.getAllSync.mockReturnValue([{ id: "var1", cultivo_id: "c1", code: "CRI", name: "Criolla", is_active: 1 }] as never);
      const result = visitasCampoRepository.getVariedadesByCultivo("c1");
      expect(sqlOf(database.getAllSync.mock.calls).some((s) => s.includes("WHERE cultivo_id"))).toBe(true);
      expect(result[0].name).toBe("Criolla");
    });
  });

  describe("#getCampaniasByCultivo", () => {
    it("should filter campanias by cultivo_id", () => {
      database.getAllSync.mockReturnValue([{ id: "camp1", cultivo_id: "c1", name: "Campania 2026", start_date: "2026-01-01", end_date: null, description: null, is_active: 1 }] as never);
      const result = visitasCampoRepository.getCampaniasByCultivo("c1");
      expect(result[0].name).toBe("Campania 2026");
    });
  });

  describe("#getEtapasFenologicasByCultivo", () => {
    it("should filter etapas by cultivo_id", () => {
      database.getAllSync.mockReturnValue([{ id: "e1", cultivo_id: "c1", name: "Floracion", description: null, sort_order: 1, type: "Etapa" as const, is_active: 1 }] as never);
      const result = visitasCampoRepository.getEtapasFenologicasByCultivo("c1");
      expect(result[0].name).toBe("Floracion");
    });
  });

  describe("#getSubEtapasByEtapaFenologica", () => {
    it("should query sub etapas by etapa id", () => {
      database.getAllSync.mockReturnValue([{ id: "se1", etapa_fenologica_id: "e1", name: "Sub A", sort_order: 1, description: null, percentage: "50", is_active: 1 }] as never);
      const result = visitasCampoRepository.getSubEtapasByEtapaFenologica("e1");
      expect(result[0].name).toBe("Sub A");
    });
  });

  describe("#getRecentByAgronomistUserId", () => {
    it("should return recent visitas for agronomist", () => {
      database.getAllSync.mockReturnValue([visitaRow] as never);
      expect(visitasCampoRepository.getRecentByAgronomistUserId("u1", 3)).toHaveLength(1);
    });
  });
});
