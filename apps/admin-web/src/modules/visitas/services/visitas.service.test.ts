import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { visitasService } from "./visitas.service";

const session = { accessToken: "access-token", tokenType: "Bearer" };

type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function apiResponse(data: unknown, status = 200, meta?: Record<string, unknown>): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          success: true,
          data,
          ...(meta ? { meta } : {}),
          timestamp: "2026-06-17T00:00:00.000Z"
        })
      )
  };
}

function expectGetRequest(fetchMock: ReturnType<typeof vi.fn>, expectedPath: string) {
  const calls = fetchMock.mock.calls;
  const found = calls.some(
    ([url]: [string]) => String(url) === `http://127.0.0.1:3001${expectedPath}`
  );
  expect(found).toBe(true);
}

describe("visitasService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const emptyFilters = {
    agronomistUserId: "",
    productorId: "",
    campaignId: "",
    parcelaId: "",
    startDate: "",
    endDate: ""
  };

  describe("#getList", () => {
    it("should fetch visitas with pagination and auth headers", async () => {
      fetchMock.mockResolvedValue(
        apiResponse([{ id: "1", parcelaId: "10" }], 200, { total: 50 })
      );

      const result = await visitasService.getList(session, emptyFilters, 1, 30);

      expectGetRequest(fetchMock, "/visitas-campo?page=1&limit=30");
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it("should build query string with all filter params", async () => {
      fetchMock.mockResolvedValue(
        apiResponse([], 200, { total: 0 })
      );

      await visitasService.getList(session, {
        agronomistUserId: "user-1",
        productorId: "100",
        campaignId: "200",
        parcelaId: "300",
        startDate: "2026-01-01",
        endDate: "2026-06-30"
      }, 1, 50);

      const calls = fetchMock.mock.calls;
      const [url] = calls[0] as [string];
      expect(String(url)).toContain("agronomo_usuario_id=user-1");
      expect(String(url)).toContain("productor_id=100");
      expect(String(url)).toContain("campania_id=200");
      expect(String(url)).toContain("parcela_id=300");
      expect(String(url)).toContain("fecha_desde=2026-01-01");
      expect(String(url)).toContain("fecha_hasta=2026-06-30");
      expect(String(url)).toContain("page=1");
      expect(String(url)).toContain("limit=50");
    });

    it("should read count from meta.total", async () => {
      fetchMock.mockResolvedValue(
        apiResponse([{ id: "1" }, { id: "2" }, { id: "3" }], 200, { total: 42 })
      );

      const result = await visitasService.getList(session, emptyFilters);

      expect(result.count).toBe(42);
      expect(result.totalPages).toBe(2);
    });

    it("should fallback to array length when meta.total is absent", async () => {
      fetchMock.mockResolvedValue(
        apiResponse([{ id: "1" }, { id: "2" }], 200, { count: 2 })
      );

      const result = await visitasService.getList(session, emptyFilters);

      expect(result.count).toBe(2);
    });
  });

  describe("#getFilterCatalogs", () => {
    it("should fetch productores, campanias, parcelas, and usuarios in parallel", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([{ id: "1", firstName: "Juan", lastName: "Perez", documentNumber: null, email: null, publicId: "pub-1" }], 200, { total: 1 }))
        .mockResolvedValueOnce(apiResponse([{ id: "10", name: "Campania 2026", cultivoId: "5", startDate: "2026-01-01", endDate: null }], 200, { total: 1 }))
        .mockResolvedValueOnce(apiResponse([{ id: "100", code: "P-001", name: "Parcela Norte", productorId: "1", sectorId: "50", areaHectares: "2.5" }], 200, { total: 1 }))
        .mockResolvedValueOnce(apiResponse([{ id: "user-1", displayName: "Carlos Lopez", email: "carlos@test.com", isActive: true }]));

      const result = await visitasService.getFilterCatalogs(session);

      expect(result.productores).toHaveLength(1);
      expect(result.productores[0].label).toBe("Juan Perez");
      expect(result.campanias).toHaveLength(1);
      expect(result.campanias[0].label).toBe("Campania 2026");
      expect(result.parcelas).toHaveLength(1);
      expect(result.parcelas[0].label).toBe("P-001 - Parcela Norte");
      expect(result.agronomos).toHaveLength(1);
    });

    it("should build productor label from documentNumber when name is missing", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([{ id: "1", firstName: null, lastName: null, documentNumber: "12345678", email: null, publicId: "pub-1" }], 200, { total: 1 }))
        .mockResolvedValueOnce(apiResponse([], 200, { total: 0 }))
        .mockResolvedValueOnce(apiResponse([], 200, { total: 0 }))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await visitasService.getFilterCatalogs(session);

      expect(result.productores[0].label).toBe("12345678");
    });

    it("should filter inactive agronomists", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([], 200, { total: 0 }))
        .mockResolvedValueOnce(apiResponse([], 200, { total: 0 }))
        .mockResolvedValueOnce(apiResponse([], 200, { total: 0 }))
        .mockResolvedValueOnce(apiResponse([
          { id: "u1", displayName: "Active", email: "active@test.com", isActive: true },
          { id: "u2", displayName: "Inactive", email: "inactive@test.com", isActive: false }
        ]));

      const result = await visitasService.getFilterCatalogs(session);

      expect(result.agronomos).toHaveLength(1);
      expect(result.agronomos[0].id).toBe("u1");
    });
  });

  describe("#getFullDetail", () => {
    it("should fetch detail and all lookup data", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse({
          visita: { id: "v1", agronomistUserId: "u1", cropId: "c1", varietyId: "var1", parcelaId: "p1", campaignId: "camp1", phenologicalStageId: "stage1", visitDate: "2026-06-01" },
          evaluaciones: [],
          observacionesSanitarias: [],
          riego: null,
          laboresCulturales: [],
          calificaciones: []
        }))
        .mockResolvedValueOnce(apiResponse({ id: "u1", displayName: "Carlos" }))
        .mockResolvedValueOnce(apiResponse({ id: "c1", name: "Banano" }))
        .mockResolvedValueOnce(apiResponse({ id: "var1", name: "Criolla" }))
        .mockResolvedValueOnce(apiResponse({ id: "p1", productorId: "prod1", sectorId: "s1", code: "P-001" }))
        .mockResolvedValueOnce(apiResponse({ id: "camp1", name: "Campania 2026" }))
        .mockResolvedValueOnce(apiResponse({ id: "stage1", name: "Floracion" }))
        .mockResolvedValueOnce(apiResponse({ id: "prod1", firstName: "Juan" }))
        .mockResolvedValueOnce(apiResponse([{ id: "sub1", name: "Sub-etapa 1" }]))
        .mockResolvedValueOnce(apiResponse([{ id: "pd1", name: "Plaga A", type: "plaga" }]))
        .mockResolvedValueOnce(apiResponse([{ id: "lvl1", name: "Bajo" }]))
        .mockResolvedValueOnce(apiResponse([{ id: "tr1", name: "Goteo" }]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse({ scores: {} }));

      const result = await visitasService.getFullDetail(session, "v1");

      expect(result.lookups.agronomist).toEqual({ id: "u1", name: "Carlos" });
      expect(result.lookups.crop?.name).toBe("Banano");
      expect(result.lookups.productor?.id).toBe("prod1");
      expect(result.lookups.subEtapas).toHaveLength(1);
      expect(result.lookups.tiposRiego).toHaveLength(1);
    });

    it("should handle missing phenological stage gracefully", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse({
          visita: { id: "v2", agronomistUserId: "u1", cropId: "c1", varietyId: "var1", parcelaId: "p1", campaignId: "camp1", phenologicalStageId: null },
          evaluaciones: [], observacionesSanitarias: [], riego: null, laboresCulturales: [], calificaciones: []
        }))
        .mockResolvedValueOnce(apiResponse({ id: "u1", displayName: "Carlos" }))
        .mockResolvedValueOnce(apiResponse({ id: "c1", name: "Banano" }))
        .mockResolvedValueOnce(apiResponse({ id: "var1", name: "Criolla" }))
        .mockResolvedValueOnce(apiResponse({ id: "p1", productorId: null, sectorId: "s1", code: "P-001" }))
        .mockResolvedValueOnce(apiResponse({ id: "camp1", name: "Campania 2026" }))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await visitasService.getFullDetail(session, "v2");

      expect(result.lookups.phenologicalStage).toBeNull();
      expect(result.lookups.productor).toBeNull();
      expect(result.lookups.subEtapas).toEqual([]);
    });
  });

  describe("#getRecetaByVisitaId", () => {
    it("should fetch receta for a visita", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({ id: "r1", visitaId: "v1" }));

      const result = await visitasService.getRecetaByVisitaId(session, "v1");

      expectGetRequest(fetchMock, "/visitas-campo/v1/receta");
      expect(result).toEqual({ id: "r1", visitaId: "v1" });
    });
  });

  describe("#getRecetaConsolidacion", () => {
    it("should fetch consolidacion for a visita", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({ hallazgos: [] }));

      await visitasService.getRecetaConsolidacion(session, "v1");

      expectGetRequest(fetchMock, "/visitas-campo/v1/receta/consolidacion");
    });
  });

  describe("#getCoadyuvantes", () => {
    it("should fetch coadyuvantes catalog", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse([{ id: "1", name: "Coadyuvante A" }]));

      const result = await visitasService.getCoadyuvantes(session);

      expect(result).toHaveLength(1);
    });
  });

  describe("#getHistoryByProductor", () => {
    it("should fetch history with filters and pagination", async () => {
      fetchMock.mockResolvedValueOnce(
        apiResponse({
          productor: { id: "100" },
          filters: {},
          visitas: [{ id: "v1", visitDate: "2026-01-01" }, { id: "v2", visitDate: "2026-01-02" }]
        }, 200, { total: 15 })
      );

      const result = await visitasService.getHistoryByProductor(session, "100", {
        campaignId: "camp1",
        agronomistUserId: "u1",
        startDate: "2026-01-01",
        endDate: "2026-06-30"
      }, 2, 10);

      const calls = fetchMock.mock.calls;
      const [url] = calls[0] as [string];
      expect(String(url)).toContain("campania_id=camp1");
      expect(String(url)).toContain("agronomo_usuario_id=u1");
      expect(String(url)).toContain("page=2");
      expect(String(url)).toContain("limit=10");
      expect(result.count).toBe(15);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
    });
  });

  describe("#getProductorCalificacion", () => {
    it("should fetch calificacion without campaign filter", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({ score: 85 }));

      await visitasService.getProductorCalificacion(session, "100");

      expectGetRequest(fetchMock, "/productores/100/calificacion");
    });

    it("should append campaignId query param when provided", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({ score: 90 }));

      await visitasService.getProductorCalificacion(session, "100", "camp1");

      expectGetRequest(fetchMock, "/productores/100/calificacion?campania_id=camp1");
    });
  });

  describe("#getParcelasVisitadasByAgronomo", () => {
    it("should group visitas by parcela and sort by lastVisitDate DESC", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([
          { id: "v1", parcelaId: "p1", visitDate: "2026-03-01" },
          { id: "v2", parcelaId: "p1", visitDate: "2026-06-01" },
          { id: "v3", parcelaId: "p2", visitDate: "2026-01-15" }
        ]))
        .mockResolvedValueOnce(apiResponse([
          { id: "p1", code: "P-001", name: "Parcela Norte", productorId: "1", sectorId: "s1", areaHectares: "2" },
          { id: "p2", code: "P-002", name: "Parcela Sur", productorId: "1", sectorId: "s1", areaHectares: "3" }
        ]));

      const result = await visitasService.getParcelasVisitadasByAgronomo(session, "u1", "Carlos");

      expect(result.agronomistLabel).toBe("Carlos");
      expect(result.totalVisitas).toBe(3);
      expect(result.parcelas).toHaveLength(2);

      const parcela1 = result.parcelas.find((p) => p.parcelaId === "p1")!;
      expect(parcela1.visitCount).toBe(2);
      expect(parcela1.firstVisitDate).toBe("2026-03-01");
      expect(parcela1.lastVisitDate).toBe("2026-06-01");
    });

    it("should fallback label when parcela not found", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([{ id: "v1", parcelaId: "p99", visitDate: "2026-01-01" }]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await visitasService.getParcelasVisitadasByAgronomo(session, "u1", "Carlos");

      expect(result.parcelas[0].parcelaLabel).toBe("Parcela #p99");
    });
  });

  describe("#getHistoryByParcela", () => {
    it("should fetch parcela history with sector lookup", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse({
          parcela: { id: "p1", sectorId: "s1", code: "P-001" },
          visitas: [{ id: "v1" }, { id: "v2" }]
        }, 200, { total: 8 }))
        .mockResolvedValueOnce(apiResponse({ id: "s1", name: "Sector Norte" }));

      const result = await visitasService.getHistoryByParcela(session, "p1", 1, 10);

      expectGetRequest(fetchMock, "/parcelas/p1/historial-visitas?page=1&limit=10");
      expect(result.lookups.sector).toEqual({ id: "s1", name: "Sector Norte" });
      expect(result.count).toBe(8);
    });

    it("should handle missing sector gracefully", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse({
          parcela: { id: "p1", sectorId: "s99", code: "P-001" },
          visitas: []
        }, 200, { total: 0 }))
        .mockRejectedValueOnce(new Error("Not found"));

      const result = await visitasService.getHistoryByParcela(session, "p1");

      expect(result.lookups.sector).toBeNull();
    });
  });
});
