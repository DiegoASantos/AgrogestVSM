import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapasService } from "./mapas.service";

const session = { accessToken: "access-token", tokenType: "Bearer" };

type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function apiResponse(data: unknown, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          success: true,
          data,
          timestamp: "2026-06-17T00:00:00.000Z"
        })
      )
  };
}

function makeParcelaApiItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    publicId: "pub-p1",
    productorId: "prod1",
    sectorId: "s1",
    code: "P-001",
    name: "Parcela Norte",
    areaHectares: "2.5",
    description: null,
    referencePoint: { type: "Point", coordinates: [-77.03, -12.04] },
    geometry: {
      type: "MultiPolygon",
      coordinates: [[[[-77.03, -12.04], [-77.04, -12.04], [-77.04, -12.05], [-77.03, -12.05], [-77.03, -12.04]]]]
    },
    geo: null,
    ...overrides
  };
}

function makeVisitaApiItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    publicId: "pub-v1",
    nroFicha: "F-001",
    parcelaId: "p1",
    campaignId: "camp1",
    agronomistUserId: "u1",
    phenologicalStageId: "stage-1",
    visitDate: "2026-06-01",
    isActive: true,
    visitLocation: { type: "Point", coordinates: [-77.04, -12.05] },
    geo: null,
    ...overrides
  };
}

function makeSectorApiItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    name: "Sector Norte",
    ...overrides
  };
}

function makePhenologicalStageApiItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "stage-1",
    name: "Floracion",
    sortOrder: 2,
    type: "Etapa",
    isActive: true,
    ...overrides
  };
}

describe("mapasService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(apiResponse([]));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("#getOverview", () => {
    it("should fetch all data sources in parallel and build overview", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem()]))
        .mockResolvedValueOnce(apiResponse([makeVisitaApiItem()]))
        .mockResolvedValueOnce(apiResponse([makeSectorApiItem()]))
        .mockResolvedValueOnce(apiResponse([{ id: "prod1", firstName: "Juan", lastName: "Perez", documentNumber: null, publicId: "pub-prod1" }]))
        .mockResolvedValueOnce(apiResponse([{ id: "camp1", name: "Campania 2026" }]))
        .mockResolvedValueOnce(apiResponse([{ id: "u1", displayName: "Carlos Lopez", email: "carlos@test.com", isActive: true }]))
        .mockResolvedValueOnce(apiResponse([makePhenologicalStageApiItem()]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.items).toHaveLength(1);
      expect(result.parcelas.mappableItems).toHaveLength(1);
      expect(result.parcelas.missingGeodataItems).toHaveLength(0);
      expect(result.parcelas.totals.activeParcelasCount).toBe(1);
      expect(result.parcelas.totals.polygonParcelasCount).toBe(1);
      expect(result.visitas.items).toHaveLength(1);
      expect(result.visitas.mappableItems).toHaveLength(1);
      expect(result.visitas.items[0]?.agronomistName).toBe("Carlos Lopez");
      expect(result.visitas.items[0]?.phenologicalStageName).toBe("Floracion");
      expect(result.visitas.items[0]?.phenologicalStageType).toBe("Etapa");
      expect(result.phenologicalStages).toEqual([makePhenologicalStageApiItem()]);
      expect(
        fetchMock.mock.calls.some(
          ([path]) => String(path) === "http://127.0.0.1:3001/usuarios/agronomos"
        )
      ).toBe(true);
      expect(
        fetchMock.mock.calls.some(
          ([path]) =>
            String(path) ===
            "http://127.0.0.1:3001/etapas-fenologicas?page=1&limit=200"
        )
      ).toBe(true);

      const parcelaItem = result.parcelas.items[0];
      expect(parcelaItem.productorLabel).toBe("Juan Perez");
      expect(parcelaItem.sectorName).toBe("Sector Norte");
      expect(parcelaItem.hasGeodata).toBe(true);
      expect(parcelaItem.hasPolygon).toBe(true);
      expect(parcelaItem.hasPoint).toBe(true);
    });

    it("should classify parcelas without geodata as missing", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem({
          referencePoint: null,
          geometry: null
        })]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.mappableItems).toHaveLength(0);
      expect(result.parcelas.missingGeodataItems).toHaveLength(1);
      expect(result.parcelas.totals.missingGeodataCount).toBe(1);
    });

    it("should normalize geo.point over referencePoint when both exist", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem({
          geo: {
            point: { type: "Point", coordinates: [-78.0, -13.0] },
            polygon: null
          },
          referencePoint: { type: "Point", coordinates: [-77.0, -12.0] }
        })]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      const parcelaItem = result.parcelas.items[0];
      expect(parcelaItem.referencePoint).toEqual({
        type: "Point",
        coordinates: [-78.0, -13.0]
      });
    });

    it("should handle invalid GeoJSON and return null geometries", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem({
          referencePoint: { type: "LineString", coordinates: [[-77.0, -12.0], [-77.1, -12.1]] },
          geometry: { type: "Point", coordinates: [-77.0, -12.0] }
        })]))
        .mockResolvedValueOnce(apiResponse([makeVisitaApiItem({
          visitLocation: { type: "Polygon", coordinates: [] }
        })]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.items[0].hasGeodata).toBe(false);
      expect(result.parcelas.items[0].referencePoint).toBeNull();
      expect(result.parcelas.items[0].geometry).toBeNull();
      expect(result.visitas.items[0].hasGeodata).toBe(false);
      expect(result.visitas.items[0].visitLocation).toBeNull();
    });

    it("should validate ring closure in MultiPolygon coordinates", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem({
          referencePoint: null,
          geometry: {
            type: "MultiPolygon",
            coordinates: [[[[-77.0, -12.0], [-77.1, -12.0], [-77.1, -12.1], [-77.0, -12.0]]]]
          }
        })]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.totals.polygonParcelasCount).toBe(1);
    });

    it("should reject non-closed rings in MultiPolygon", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem({
          referencePoint: null,
          geometry: {
            type: "MultiPolygon",
            coordinates: [[[[-77.0, -12.0], [-77.1, -12.0], [-77.1, -12.1], [-77.2, -12.2]]]]
          }
        })]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.totals.polygonParcelasCount).toBe(0);
    });

    it("should count pointOnlyParcelas that have point but no polygon", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem({
          referencePoint: { type: "Point", coordinates: [-77.0, -12.0] },
          geometry: null
        })]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.totals.pointOnlyParcelasCount).toBe(1);
      expect(result.parcelas.totals.polygonParcelasCount).toBe(0);
    });

    it("should reject invalid lat/lon coordinate ranges", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem({
          referencePoint: { type: "Point", coordinates: [999, 999] },
          geometry: null
        })]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.items[0].hasGeodata).toBe(false);
    });

    it("should build productorLabel from documentNumber when name missing", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse([makeParcelaApiItem()]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([makeSectorApiItem()]))
        .mockResolvedValueOnce(apiResponse([{ id: "prod1", firstName: null, lastName: null, documentNumber: "12345678", publicId: "pub-prod1" }]))
        .mockResolvedValueOnce(apiResponse([]))
        .mockResolvedValueOnce(apiResponse([]));

      const result = await mapasService.getOverview(session);

      expect(result.parcelas.items[0].productorLabel).toBe("12345678");
    });
  });
});
