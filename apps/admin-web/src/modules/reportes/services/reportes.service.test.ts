import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildProductorLabel,
  buildVisitReportQuery,
  reportesService
} from "./reportes.service";

const session = { accessToken: "token", tokenType: "Bearer" };

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: string) => {
      const url = String(input);
      const data = url.includes("/usuarios/agronomos")
        ? [{ id: "7", displayName: "Ana López", isActive: true }]
        : url.includes("/productores")
          ? [makeProductor()]
          : url.includes("/parcelas")
            ? [makeParcela()]
            : { summary: [], timeline: [] };

      return Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: true,
              data,
              meta: Array.isArray(data) ? { total: data.length } : undefined,
              timestamp: ""
            })
          )
      });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reportesService", () => {
  it("builds the visits endpoint with required and optional filters", async () => {
    await reportesService.getVisitsReport(session, {
      agronomistUserId: "7",
      productorId: "15",
      startDate: "2026-09-01",
      endDate: "2026-09-30"
    });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/reportes/visitas?");
    expect(url).toContain("fecha_desde=2026-09-01");
    expect(url).toContain("fecha_hasta=2026-09-30");
    expect(url).toContain("agronomo_usuario_id=7");
    expect(url).toContain("productor_id=15");
  });

  it("omits empty optional filters", () => {
    expect(
      buildVisitReportQuery({
        agronomistUserId: "",
        productorId: "",
        startDate: "2026-09-01",
        endDate: "2026-09-04"
      })
    ).toBe("fecha_desde=2026-09-01&fecha_hasta=2026-09-04");
  });

  it("reuses minimal agronomist, producer and parcel catalogs", async () => {
    const catalogs = await reportesService.getVisitsCatalogs(session);

    expect(catalogs.agronomists[0]?.displayName).toBe("Ana López");
    expect(catalogs.productores[0]?.id).toBe("15");
    expect(catalogs.parcelas[0]?.agronomoUsuarioId).toBe("7");
    const urls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      String(call[0])
    );
    expect(urls.some((url) => url.includes("/usuarios/agronomos"))).toBe(true);
    expect(urls.some((url) => url.includes("/productores?activo=true"))).toBe(true);
    expect(urls.some((url) => url.includes("/parcelas?activo=true"))).toBe(true);
  });

  it("builds a producer label without exposing contact data", () => {
    expect(buildProductorLabel(makeProductor())).toBe("Rosa Díaz");
  });
});

function makeProductor() {
  return {
    id: "15",
    publicId: "producer-public-id",
    entityType: "persona" as const,
    documentTypeId: null,
    documentNumber: "12345678",
    firstName: "Rosa",
    lastName: "Díaz",
    phone: null,
    email: null,
    address: null,
    isActive: true,
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01"
  };
}

function makeParcela() {
  return {
    id: "21",
    publicId: "parcel-public-id",
    productorId: "15",
    subsectorId: "3",
    sectorId: "2",
    code: "PAR-021",
    name: "El Mango",
    areaHectares: "4.5",
    description: null,
    referencePoint: null,
    geometry: null,
    agronomoUsuarioId: "7",
    geo: { point: null, polygon: null, hasGeodata: false },
    isActive: true,
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01"
  };
}
