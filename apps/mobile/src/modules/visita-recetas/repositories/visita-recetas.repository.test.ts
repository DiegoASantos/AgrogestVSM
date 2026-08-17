import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn((...args: unknown[]) => {
    void args;
    return [];
  }),
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

import { visitaRecetasRepository } from "./visita-recetas.repository";

const recetaRow = {
  local_id: "r1",
  server_id: "srv-1",
  visita_local_id: "v1",
  etapa_fenologica: null,
  version: 1,
  sync_status: "synced" as const,
  sync_error_message: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01"
};

describe("visitaRecetasRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getAllSync.mockReturnValue([]);
    database.getFirstSync.mockReturnValue(null);
    database.withTransactionSync.mockImplementation((cb: () => void) => cb());
  });

  describe("#getRecetaByVisitaLocalId", () => {
    it("should find receta by visita", () => {
      database.getFirstSync.mockReturnValue(recetaRow);
      expect(visitaRecetasRepository.getRecetaByVisitaLocalId("v1")?.version).toBe(1);
    });

    it("should return null when not found", () => {
      database.getFirstSync.mockReturnValue(null);
      expect(visitaRecetasRepository.getRecetaByVisitaLocalId("x")).toBeNull();
    });

    it("restores the selected fitosanitary dose unit", () => {
      database.getFirstSync.mockReturnValue(recetaRow);
      database.getAllSync.mockImplementation((...args: unknown[]) => {
        const statement = String(args[0]);
        if (statement.includes("FROM visita_receta_mezcla")) {
          return [
            {
              local_id: "m1",
              server_id: null,
              receta_local_id: "r1",
              numero: 1,
              coadyuvantes_ids: null,
              orden_mezcla: null,
              volumen_aplicacion: "2",
              factor: "1",
              factor_editable: 0,
              cantidad_total_producto: "500",
              sync_status: "pending",
              created_at: "2026-01-01",
              updated_at: "2026-01-01"
            }
          ] as never;
        }
        if (statement.includes("FROM visita_receta_fitosanidad")) {
          return [
            {
              local_id: "p1",
              server_id: null,
              receta_local_id: "r1",
              mezcla_local_id: "m1",
              numero: 1,
              objetivo: "plaga",
              objetivo_nombre: "Trips",
              tipo_control_id: null,
              tipo_producto_id: null,
              disolvente: "Agua",
              modo_accion_id: null,
              ingrediente_activo_nombre: "Abamectina",
              dosis_ia: "250",
              dosis_producto: "250",
              unidad_dosis: "g/cilindro",
              volumen_aplicacion: "2",
              cantidad_total_ia: null,
              marca_producto_nombre: "Agrimec",
              concentracion_producto: null,
              cantidad_total_producto: "500",
              coadyuvantes_ids: null,
              orden_mezcla: null,
              sync_status: "pending",
              created_at: "2026-01-01",
              updated_at: "2026-01-01"
            }
          ] as never;
        }
        return [];
      });

      const result = visitaRecetasRepository.getRecetaByVisitaLocalId("v1");

      expect(result?.mezclas[0]?.productos[0]?.unidadDosis).toBe("g/cilindro");
    });
  });

  describe("#getCoadyuvantes", () => {
    it("should query coadyuvantes ordered by name", () => {
      database.getAllSync.mockReturnValue([
        { id: "co1", name: "Aceite agricola", description: null, is_active: 1 }
      ] as never);
      const result = visitaRecetasRepository.getCoadyuvantes();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Aceite agricola");
    });
  });

  describe("#getIngredientesActivos", () => {
    it("should query ingredientes activos", () => {
      database.getAllSync.mockReturnValue([
        { id: "ia1", name: "Glifosato", is_active: 1 }
      ] as never);
      const result = visitaRecetasRepository.getIngredientesActivos();
      expect(result[0].name).toBe("Glifosato");
      expect(database.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining("catalog_visible = 1 OR sync_status <> 'synced'")
      );
    });
  });

  describe("#getFertilizantes", () => {
    it("should query fertilizantes with defaults fallback", () => {
      database.getAllSync.mockReturnValue([
        {
          id: "f1",
          name: "Urea",
          type: "solido",
          concentracion: null,
          unidad_medida: null,
          is_active: 1
        }
      ] as never);
      const result = visitaRecetasRepository.getFertilizantes();
      expect(result).toHaveLength(1);
      expect(database.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining("catalog_visible = 1 OR sync_status <> 'synced'")
      );
    });
  });

  describe("#getMarcasProducto", () => {
    it("should query marcas producto", () => {
      database.getAllSync.mockReturnValue([
        { id: "mp1", name: "Marca A", is_active: 1 }
      ] as never);
      expect(visitaRecetasRepository.getMarcasProducto()).toHaveLength(1);
      expect(database.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining("catalog_visible = 1 OR sync_status <> 'synced'")
      );
    });
  });

  describe("#getTiposControl", () => {
    it("should query tipos control ordered by name", () => {
      database.getAllSync.mockReturnValue([
        { id: "tc1", name: "Quimico", is_active: 1 }
      ] as never);
      expect(visitaRecetasRepository.getTiposControl()).toHaveLength(1);
    });
  });
});
