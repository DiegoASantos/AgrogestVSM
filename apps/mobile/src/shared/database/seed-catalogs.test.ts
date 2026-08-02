import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runSync = vi.fn();
const execSync = vi.fn();
const getAllSync = vi.fn(() => []);
const getFirstSync = vi.fn(() => null);
const withTransactionSync = vi.fn((cb: () => void) => cb());

vi.mock("expo-sqlite", () => ({
  openDatabaseSync: () => ({ runSync, execSync, getAllSync, getFirstSync, withTransactionSync })
}));

vi.mock("../connection", () => ({
  getDatabase: () => ({ runSync, execSync, getAllSync, getFirstSync, withTransactionSync }),
  initDatabase: () => ({ runSync, execSync, getAllSync, getFirstSync, withTransactionSync })
}));

vi.mock("./catalog-status", () => ({
  getCatalogsDownloadedAt: () => null
}));

vi.mock("./catalog-download-state", () => ({
  notifyCatalogDownloadStarted: vi.fn(),
  notifyCatalogDownloadCompleted: vi.fn()
}));

const mockGetAllProductores = vi.fn(() => Promise.resolve([]));
const mockGetAllParcelas = vi.fn(() => Promise.resolve([]));

vi.mock("../../modules/productores/services/productores.remote", () => ({
  productoresRemote: { getAll: (...args: unknown[]) => mockGetAllProductores(...args) }
}));
vi.mock("../../modules/sectores/services/sectores.remote", () => ({
  sectoresRemote: { getAll: () => Promise.resolve([]) }
}));
vi.mock("../../modules/subsectores/services/subsectores.remote", () => ({
  subsectoresRemote: { getAll: () => Promise.resolve([]) }
}));
vi.mock("../../modules/parcelas/services/parcelas.remote", () => ({
  parcelasRemote: { getAll: (...args: unknown[]) => mockGetAllParcelas(...args) }
}));
vi.mock("../../modules/geografias/services/geografias.remote", () => ({
  geografiasRemote: { getDistritos: () => Promise.resolve([]) }
}));
vi.mock("../../modules/visitas-campo/services/visita-campo-catalogs.remote", () => ({
  visitaCampoCatalogsRemote: {
    getCultivos: () => Promise.resolve([]),
    getVariedadesByCultivo: () => Promise.resolve([]),
    getCampaniasByCultivo: () => Promise.resolve([]),
    getEtapasFenologicasByCultivo: () => Promise.resolve([]),
    getSubEtapas: () => Promise.resolve([])
  }
}));
vi.mock("../../modules/observaciones-sanitarias/services/observaciones-sanitarias.remote", () => ({
  observacionesSanitariasRemote: {
    getPestDiseases: () => Promise.resolve([]),
    getIncidenceLevels: () => Promise.resolve([]),
    getPestDiseaseStageLevels: () => Promise.resolve([])
  }
}));
vi.mock("../../modules/nutricion/services/nutricion.remote", () => ({
  nutricionRemote: { getNutrients: () => Promise.resolve([]) }
}));
vi.mock("../../modules/riegos/services/riegos.remote", () => ({
  riegosRemote: { getTiposRiego: () => Promise.resolve([]) }
}));
vi.mock("../../modules/labores-culturales-visita/services/labores-culturales-visita.remote", () => ({
  laboresCulturalesVisitaRemote: { getLaboresCulturales: () => Promise.resolve([]) }
}));
vi.mock("../../modules/visita-recetas/services/visita-recetas.remote", () => ({
  visitaRecetasRemote: {
    getCoadyuvantes: () => Promise.resolve([]),
    getIngredientesActivos: () => Promise.resolve([]),
    getMarcasProducto: () => Promise.resolve([]),
    getModosAccion: () => Promise.resolve([]),
    getTiposControl: () => Promise.resolve([]),
    getTiposProductoFitosanitario: () => Promise.resolve([]),
    getFertilizantes: () => Promise.resolve([])
  }
}));
vi.mock("../../modules/nutricion/repositories", () => ({
  nutricionRepository: {
    ensureStorage: vi.fn(),
    insertNutrients: vi.fn()
  }
}));

const runSyncCalls: Array<{ sql: string; params: unknown[] }> = [];
const execSyncCalls: string[] = [];

describe("seed-catalogs convergence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runSyncCalls.length = 0;
    execSyncCalls.length = 0;

    runSync.mockImplementation((sql: string, ...params: unknown[]) => {
      runSyncCalls.push({ sql: sql.replace(/\s+/gu, " ").trim(), params });
    });
    execSync.mockImplementation((sql: string) => {
      execSyncCalls.push(sql.replace(/\s+/gu, " ").trim());
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts productores with ON CONFLICT and WHERE sync_status <> 'pending' guard", async () => {
    mockGetAllProductores.mockResolvedValue([{
      id: "101", publicId: "pub-101", entityType: "persona" as const,
      firstName: "Juan", lastName: "Perez", documentTypeId: 1, documentNumber: "123",
      phone: null, email: null, address: null, isActive: true,
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z"
    }]);

    getFirstSync.mockReturnValue(null);

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const productorInsert = runSyncCalls.find(
      (c) => c.sql.includes("INSERT INTO productores") && c.sql.includes("ON CONFLICT")
    );
    expect(productorInsert).toBeDefined();
    expect(productorInsert!.sql).toContain("sync_status <> 'pending'");
  });

  it("uses resolveLocalCatalogId to preserve local id for existing synced productor", async () => {
    mockGetAllProductores.mockResolvedValue([{
      id: "101", publicId: "pub-101", entityType: "persona" as const,
      firstName: "Juan", lastName: "Perez", documentTypeId: 1, documentNumber: "123",
      phone: null, email: null, address: null, isActive: true,
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z"
    }]);

    getFirstSync.mockReturnValue({ id: "existing-local-1" });

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const productorInsert = runSyncCalls.find(
      (c) => c.sql.includes("INSERT INTO productores") && c.sql.includes("ON CONFLICT")
    );
    expect(productorInsert).toBeDefined();
    expect(productorInsert!.params[0]).toBe("existing-local-1");
  });

  it("does NOT delete productores without parcelas (no cleanup for productores)", async () => {
    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const deleteProductor = runSyncCalls.find(
      (c) => c.sql.includes("DELETE FROM productores")
    );
    expect(deleteProductor).toBeUndefined();
  });

  it("delete parcelas excludes pending ones (WHERE sync_status)", async () => {
    mockGetAllParcelas.mockResolvedValue([{
      id: "100", publicId: "pub-100", productorId: "1", subsectorId: "1",
      code: "PAR-100", name: "Parcela", areaHectares: null, description: null,
      referencePoint: null, geometry: null, isActive: true,
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z"
    }]);

    getFirstSync.mockReturnValue(null);

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const parcelaDelete = runSyncCalls.find(
      (c) => c.sql.includes("DELETE FROM parcelas")
    );
    if (parcelaDelete) {
      expect(parcelaDelete.sql).toContain("sync_status");
    }
  });

  it("migration 51 backfills server_id = id for all 4 tables", async () => {
    const { runMigrations } = await import("./migrations");

    const execFn = vi.fn();
    const dbForMigration = {
      runSync: vi.fn(),
      execSync: execFn,
      getAllSync: vi.fn(() => []),
      getFirstSync: vi.fn(() => null),
      withTransactionSync: vi.fn((cb: () => void) => cb())
    };

    await runMigrations(dbForMigration as never, 51);

    const allExec = execFn.mock.calls
      .map((call: string[]) => call[0])
      .join("\n");

    for (const table of ["productores", "sectores", "subsectores", "parcelas"]) {
      expect(allExec).toContain(`UPDATE ${table}`);
      expect(allExec).toContain("SET server_id = id");
    }
  });
});
