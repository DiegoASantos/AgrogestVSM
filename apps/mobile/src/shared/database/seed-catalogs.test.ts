import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runSync = vi.fn();
const execSync = vi.fn();
const getAllSync = vi.fn<(sql: string, ...params: unknown[]) => unknown[]>(() => []);
const getFirstSync = vi.fn<
  (sql: string, ...params: unknown[]) => Record<string, unknown> | null
>(() => null);
const withTransactionSync = vi.fn((cb: () => void) => cb());
let isInTransaction = false;
const isInTransactionSync = vi.fn(() => isInTransaction);

vi.mock("expo-sqlite", () => ({
  openDatabaseSync: () => ({
    runSync,
    execSync,
    getAllSync,
    getFirstSync,
    isInTransactionSync,
    withTransactionSync
  })
}));

vi.mock("../connection", () => ({
  getDatabase: () => ({
    runSync,
    execSync,
    getAllSync,
    getFirstSync,
    isInTransactionSync,
    withTransactionSync
  }),
  initDatabase: () => ({
    runSync,
    execSync,
    getAllSync,
    getFirstSync,
    isInTransactionSync,
    withTransactionSync
  })
}));

vi.mock("./catalog-status", () => ({
  getCatalogsDownloadedAt: () => null
}));

vi.mock("./catalog-session", () => ({
  getCatalogSessionUserId: () => "agronomo-1"
}));

vi.mock("./catalog-download-state", () => ({
  notifyCatalogDownloadStarted: vi.fn(),
  notifyCatalogDownloadCompleted: vi.fn()
}));

const mockGetAllProductores = vi.fn<() => Promise<Array<Record<string, unknown>>>>(() =>
  Promise.resolve([])
);
const mockGetAllParcelas = vi.fn<() => Promise<Array<Record<string, unknown>>>>(() =>
  Promise.resolve([])
);
const mockGetIngredientesActivos = vi.fn<() => Promise<Array<Record<string, unknown>>>>(
  () => Promise.resolve([])
);
const mockGetMarcasProducto = vi.fn<() => Promise<Array<Record<string, unknown>>>>(() =>
  Promise.resolve([])
);
const mockGetFertilizantes = vi.fn<() => Promise<Array<Record<string, unknown>>>>(() =>
  Promise.resolve([])
);

vi.mock("../../modules/productores/services/productores.remote", () => ({
  productoresRemote: { getAll: mockGetAllProductores }
}));
vi.mock("../../modules/sectores/services/sectores.remote", () => ({
  sectoresRemote: { getAll: () => Promise.resolve([]) }
}));
vi.mock("../../modules/subsectores/services/subsectores.remote", () => ({
  subsectoresRemote: { getAll: () => Promise.resolve([]) }
}));
vi.mock("../../modules/parcelas/services/parcelas.remote", () => ({
  parcelasRemote: { getAll: mockGetAllParcelas }
}));
vi.mock("../../modules/tipos-documento/services/tipos-documento.remote", () => ({
  tiposDocumentoRemote: { obtenerTodos: () => Promise.resolve([]) }
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
vi.mock(
  "../../modules/observaciones-sanitarias/services/observaciones-sanitarias.remote",
  () => ({
    observacionesSanitariasRemote: {
      getPestDiseases: () => Promise.resolve([]),
      getIncidenceLevels: () => Promise.resolve([]),
      getPestDiseaseStageLevels: () => Promise.resolve([])
    }
  })
);
vi.mock("../../modules/nutricion/services/nutricion.remote", () => ({
  nutricionRemote: { getNutrients: () => Promise.resolve([]) }
}));
vi.mock("../../modules/riegos/services/riegos.remote", () => ({
  riegosRemote: { getTiposRiego: () => Promise.resolve([]) }
}));
vi.mock(
  "../../modules/labores-culturales-visita/services/labores-culturales-visita.remote",
  () => ({
    laboresCulturalesVisitaRemote: { getLaboresCulturales: () => Promise.resolve([]) }
  })
);
vi.mock("../../modules/visita-recetas/services/visita-recetas.remote", () => ({
  visitaRecetasRemote: {
    getCoadyuvantes: () => Promise.resolve([]),
    getIngredientesActivos: mockGetIngredientesActivos,
    getMarcasProducto: mockGetMarcasProducto,
    getModosAccion: () => Promise.resolve([]),
    getTiposControl: () => Promise.resolve([]),
    getTiposProductoFitosanitario: () => Promise.resolve([]),
    getFertilizantes: mockGetFertilizantes
  }
}));
vi.mock("../../modules/nutricion/repositories", () => ({
  nutricionRepository: {
    ensureStorage: vi.fn(),
    insertNutrients: vi.fn()
  }
}));

const runSyncCalls: Array<{ sql: string; params: unknown[] }> = [];

describe("seed-catalogs convergence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runSyncCalls.length = 0;
    mockGetAllProductores.mockResolvedValue([]);
    mockGetAllParcelas.mockResolvedValue([]);
    mockGetIngredientesActivos.mockResolvedValue([]);
    mockGetMarcasProducto.mockResolvedValue([]);
    mockGetFertilizantes.mockResolvedValue([]);
    isInTransaction = false;

    runSync.mockImplementation((sql: string, ...params: unknown[]) => {
      runSyncCalls.push({ sql: sql.replace(/\s+/gu, " ").trim(), params });
    });
    execSync.mockImplementation((statement: string) => {
      if (statement === "BEGIN") isInTransaction = true;
      if (statement === "COMMIT" || statement === "ROLLBACK") {
        isInTransaction = false;
      }
    });
    getAllSync.mockReturnValue([]);
    getFirstSync.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the safe transaction wrapper for the complete catalog replacement", async () => {
    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    expect(execSync).toHaveBeenCalledWith("BEGIN");
    expect(execSync).toHaveBeenCalledWith("COMMIT");
    expect(withTransactionSync).not.toHaveBeenCalled();
  });

  it("reuses an existing transaction without opening or closing a nested one", async () => {
    isInTransaction = true;

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    expect(execSync).not.toHaveBeenCalledWith("BEGIN");
    expect(execSync).not.toHaveBeenCalledWith("COMMIT");
    expect(withTransactionSync).not.toHaveBeenCalled();
  });

  it("inserts productores with ON CONFLICT and WHERE sync_status <> 'pending' guard", async () => {
    mockGetAllProductores.mockResolvedValue([
      {
        id: "101",
        publicId: "pub-101",
        entityType: "persona",
        firstName: "Juan",
        lastName: "Perez",
        documentTypeId: 1,
        documentNumber: "123",
        phone: null,
        email: null,
        address: null,
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z"
      }
    ]);

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const productorInsert = runSyncCalls.find(
      (c) => c.sql.includes("INSERT INTO productores") && c.sql.includes("ON CONFLICT")
    );
    expect(productorInsert).toBeDefined();
    expect(productorInsert!.sql).toContain("sync_status <> 'pending'");
  });

  it("uses resolveLocalCatalogId to preserve local id for existing synced productor", async () => {
    mockGetAllProductores.mockResolvedValue([
      {
        id: "101",
        publicId: "pub-101",
        entityType: "persona",
        firstName: "Juan",
        lastName: "Perez",
        documentTypeId: 1,
        documentNumber: "123",
        phone: null,
        email: null,
        address: null,
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z"
      }
    ]);

    (getFirstSync as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "existing-local-1"
    });

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

    const deleteProductor = runSyncCalls.find((c) =>
      c.sql.includes("DELETE FROM productores")
    );
    expect(deleteProductor).toBeUndefined();
  });

  it("delete parcelas excludes pending ones (WHERE sync_status)", async () => {
    mockGetAllParcelas.mockResolvedValue([
      {
        id: "100",
        publicId: "pub-100",
        productorId: "1",
        subsectorId: "1",
        code: "PAR-100",
        name: "Parcela",
        areaHectares: null,
        description: null,
        referencePoint: null,
        parcelReferencePoint: {
          type: "Point",
          coordinates: [-80.6321, -5.1942]
        },
        geometry: null,
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z"
      }
    ]);

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const parcelaDelete = runSyncCalls.find((c) =>
      c.sql.includes("DELETE FROM parcelas")
    );
    if (parcelaDelete) {
      expect(parcelaDelete.sql).toContain("sync_status");
    }
    const parcelaUpsert = runSyncCalls.find((c) =>
      c.sql.includes("INSERT INTO parcelas")
    );
    expect(parcelaUpsert?.sql).toContain("parcel_reference_point");
    expect(parcelaUpsert?.params).toContain(
      '{"type":"Point","coordinates":[-80.6321,-5.1942]}'
    );
  });

  it("hides only synced recipe catalogs before restoring active rows", async () => {
    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    for (const table of ["ingredientes_activos", "fertilizantes", "marcas_producto"]) {
      const hide = runSyncCalls.find(
        (call) =>
          call.sql.includes(`UPDATE ${table}`) &&
          call.sql.includes("SET catalog_visible = 0")
      );
      expect(hide?.sql).toContain("sync_status = 'synced'");
    }
    expect(
      runSyncCalls.some((call) =>
        /DELETE FROM (ingredientes_activos|fertilizantes|marcas_producto)/u.test(call.sql)
      )
    ).toBe(false);
  });

  it("reconciles local catalog errors when the API confirms the same public id", async () => {
    mockGetIngredientesActivos.mockResolvedValue([
      {
        id: "ingrediente-server-1",
        publicId: "ingrediente-public-1",
        name: "Ingrediente confirmado",
        description: null
      }
    ]);
    mockGetFertilizantes.mockResolvedValue([
      {
        id: "fertilizante-server-1",
        publicId: "fertilizante-public-1",
        name: "Fertilizante confirmado",
        type: "solido",
        concentracion: "N 20%, P 20%, K 20%",
        unidadMedida: "%"
      }
    ]);
    getAllSync.mockImplementation((sql: string) => {
      if (sql.includes("FROM ingredientes_activos")) {
        return [
          {
            id: "ingrediente-local-1",
            public_id: "ingrediente-public-1",
            server_id: null,
            sync_status: "error"
          }
        ];
      }
      if (sql.includes("FROM fertilizantes")) {
        return [
          {
            id: "fertilizante-local-1",
            public_id: "fertilizante-public-1",
            server_id: null,
            sync_status: "error"
          }
        ];
      }
      return [];
    });

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const ingredientUpsert = runSyncCalls.find((call) =>
      call.sql.includes("INSERT INTO ingredientes_activos")
    );
    expect(ingredientUpsert?.params[0]).toBe("ingrediente-local-1");
    expect(ingredientUpsert?.sql).not.toContain(
      "WHERE ingredientes_activos.sync_status = 'synced'"
    );
    expect(ingredientUpsert?.params).toContain("ingrediente-server-1");
    const fertilizerUpsert = runSyncCalls.find((call) =>
      call.sql.includes("INSERT INTO fertilizantes")
    );
    expect(fertilizerUpsert?.params[0]).toBe("fertilizante-local-1");
    expect(fertilizerUpsert?.sql).not.toContain(
      "WHERE fertilizantes.sync_status = 'synced'"
    );
    expect(
      runSyncCalls.some(
        (call) =>
          call.sql.includes("DELETE FROM sync_outbox") &&
          call.params.join("|") === "agronomo-1|ingredientes_activos|ingrediente-local-1"
      )
    ).toBe(true);
    expect(
      runSyncCalls.some(
        (call) =>
          call.sql.includes("DELETE FROM sync_outbox") &&
          call.params.join("|") === "agronomo-1|fertilizantes|fertilizante-local-1"
      )
    ).toBe(true);
    expect(
      runSyncCalls.some(
        (call) =>
          call.sql.includes("DELETE FROM sync_failures") &&
          call.params.join("|") === "agronomo-1|ingredientes_activos|ingrediente-local-1"
      )
    ).toBe(true);
  });

  it("maps a remote brand ingredient id to its canonical local id", async () => {
    mockGetIngredientesActivos.mockResolvedValue([
      {
        id: "ingrediente-server-1",
        publicId: "ingrediente-public-1",
        name: "Ingrediente",
        description: null
      }
    ]);
    mockGetMarcasProducto.mockResolvedValue([
      {
        id: "marca-server-1",
        publicId: "marca-public-1",
        name: "Marca",
        tipoProductoId: null,
        ingredienteActivoId: "ingrediente-server-1",
        ingredienteActivoNombre: "Ingrediente",
        concentracionTexto: "50 %",
        unidadMedida: "%"
      }
    ]);
    getAllSync.mockImplementation((sql: string) => {
      if (sql.includes("FROM ingredientes_activos")) {
        return [
          {
            id: "ingrediente-local-1",
            public_id: "ingrediente-public-1",
            server_id: null,
            sync_status: "pending"
          }
        ];
      }
      return [];
    });
    getFirstSync.mockImplementation((sql: string) => {
      if (sql.includes("FROM ingredientes_activos")) {
        return { id: "ingrediente-local-1" };
      }
      return null;
    });

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    const brandUpsert = runSyncCalls.find((call) =>
      call.sql.includes("INSERT INTO marcas_producto")
    );
    expect(brandUpsert?.params[4]).toBe("ingrediente-local-1");
  });

  it("consolidates duplicate ingredients and remaps existing brands", async () => {
    mockGetIngredientesActivos.mockResolvedValue([
      {
        id: "ingrediente-server-1",
        publicId: "ingrediente-public-1",
        name: "Ingrediente",
        description: null
      }
    ]);
    getAllSync.mockImplementation((sql: string) => {
      if (sql.includes("FROM ingredientes_activos")) {
        return [
          {
            id: "ingrediente-local-1",
            public_id: "ingrediente-public-1",
            server_id: null,
            sync_status: "error"
          },
          {
            id: "ingrediente-server-1",
            public_id: "ingrediente-public-1",
            server_id: "ingrediente-server-1",
            sync_status: "synced"
          }
        ];
      }
      return [];
    });

    const { downloadAllCatalogs } = await import("./seed-catalogs");
    await downloadAllCatalogs();

    expect(
      runSyncCalls.some(
        (call) =>
          call.sql.includes("UPDATE marcas_producto") &&
          call.sql.includes("SET ingrediente_activo_id = ?") &&
          call.params[0] === "ingrediente-local-1" &&
          call.params[1] === "ingrediente-server-1"
      )
    ).toBe(true);
    expect(
      runSyncCalls.some(
        (call) =>
          call.sql.includes("DELETE FROM ingredientes_activos WHERE id = ?") &&
          call.params[0] === "ingrediente-server-1"
      )
    ).toBe(true);
  });

  it("migration 53 brings the tipos_documento table", async () => {
    const { runMigrations } = await import("./migrations");

    const execuciones: string[] = [];
    const dbParaMigracion = {
      runSync: vi.fn(),
      execSync: vi.fn((sql: string) => {
        execuciones.push(sql.replace(/\s+/gu, " ").trim());
      }),
      getAllSync: vi.fn(() => []),
      getFirstSync: vi.fn(() => null),
      withTransactionSync: vi.fn((cb: () => void) => cb())
    };

    await runMigrations(dbParaMigracion as never);

    const createTiposDocumento = execuciones.find((s) =>
      s.includes("CREATE TABLE IF NOT EXISTS tipos_documento")
    );
    expect(createTiposDocumento).toBeDefined();
  });
});
