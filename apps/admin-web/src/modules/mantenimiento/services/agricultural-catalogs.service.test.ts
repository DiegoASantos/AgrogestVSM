import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { agriculturalCatalogsService } from "./agricultural-catalogs.service";

const session = {
  accessToken: "access-token",
  tokenType: "Bearer"
};

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

function expectLastRequest(
  fetchMock: ReturnType<typeof vi.fn>,
  expected: {
    path: string;
    method: "POST" | "PATCH" | "DELETE";
    body?: unknown;
  }
) {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];

  expect(String(url)).toBe(`http://127.0.0.1:3001${expected.path}`);
  expect(init).toMatchObject({
    method: expected.method,
    headers: expect.objectContaining({
      Authorization: "Bearer access-token"
    })
  });

  if (expected.body === undefined) {
    expect(init).not.toHaveProperty("body");
  } else {
    expect(JSON.parse(String(init.body))).toEqual(expected.body);
  }
}

describe("agriculturalCatalogsService CRUD", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: "cultivos",
      create: () =>
        agriculturalCatalogsService.createCultivo(session, {
          code: "MNG",
          name: "Mango",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateCultivo(session, "cultivo-1", {
          code: "MNG",
          name: "Mango Kent",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteCultivo(session, "cultivo-1"),
      createPath: "/cultivos",
      updatePath: "/cultivos/cultivo-1",
      deletePath: "/cultivos/cultivo-1",
      createBody: { code: "MNG", name: "Mango", isActive: true },
      updateBody: { code: "MNG", name: "Mango Kent", isActive: true },
      response: { id: "cultivo-1", code: "MNG", name: "Mango Kent", isActive: true }
    },
    {
      name: "campanias",
      create: () =>
        agriculturalCatalogsService.createCampania(session, {
          cultivoId: "cultivo-1",
          name: "Campania 2026",
          startDate: "2026-01-01",
          endDate: null,
          description: "Principal",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateCampania(session, "campania-1", {
          cultivoId: "cultivo-1",
          name: "Campania 2026 actualizada",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          description: "Actualizada",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteCampania(session, "campania-1"),
      createPath: "/campanias",
      updatePath: "/campanias/campania-1",
      deletePath: "/campanias/campania-1",
      createBody: {
        cultivoId: "cultivo-1",
        name: "Campania 2026",
        startDate: "2026-01-01",
        endDate: null,
        description: "Principal",
        isActive: true
      },
      updateBody: {
        cultivoId: "cultivo-1",
        name: "Campania 2026 actualizada",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        description: "Actualizada",
        isActive: true
      },
      response: {
        id: "campania-1",
        cultivoId: "cultivo-1",
        name: "Campania 2026 actualizada",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        description: "Actualizada",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-17T00:00:00.000Z"
      }
    },
    {
      name: "etapas fenologicas",
      create: () =>
        agriculturalCatalogsService.createEtapaFenologica(session, {
          cultivoId: "cultivo-1",
          name: "Floracion",
          description: "Etapa floral",
          sortOrder: 2,
          type: "Etapa",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateEtapaFenologica(session, "etapa-1", {
          cultivoId: "cultivo-1",
          name: "Floracion plena",
          description: "Etapa editada",
          sortOrder: 3,
          type: "Etapa",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteEtapaFenologica(session, "etapa-1"),
      createPath: "/etapas-fenologicas",
      updatePath: "/etapas-fenologicas/etapa-1",
      deletePath: "/etapas-fenologicas/etapa-1",
      createBody: {
        cultivoId: "cultivo-1",
        name: "Floracion",
        description: "Etapa floral",
        sortOrder: 2,
        type: "Etapa",
        isActive: true
      },
      updateBody: {
        cultivoId: "cultivo-1",
        name: "Floracion plena",
        description: "Etapa editada",
        sortOrder: 3,
        type: "Etapa",
        isActive: true
      },
      response: {
        id: "etapa-1",
        cultivoId: "cultivo-1",
        name: "Floracion plena",
        description: "Etapa editada",
        sortOrder: 3,
        type: "Etapa",
        isActive: true
      }
    },
    {
      name: "sub etapas",
      create: () =>
        agriculturalCatalogsService.createSubEtapa(session, {
          etapaFenologicaId: "etapa-1",
          name: "Cuajado",
          sortOrder: 1,
          description: "Inicio",
          percentage: 25,
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateSubEtapa(session, "sub-1", {
          etapaFenologicaId: "etapa-1",
          name: "Cuajado avanzado",
          sortOrder: 2,
          description: "Actualizado",
          percentage: 40,
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteSubEtapa(session, "sub-1"),
      createPath: "/sub-etapas",
      updatePath: "/sub-etapas/sub-1",
      deletePath: "/sub-etapas/sub-1",
      createBody: {
        etapaFenologicaId: "etapa-1",
        name: "Cuajado",
        sortOrder: 1,
        description: "Inicio",
        percentage: 25,
        isActive: true
      },
      updateBody: {
        etapaFenologicaId: "etapa-1",
        name: "Cuajado avanzado",
        sortOrder: 2,
        description: "Actualizado",
        percentage: 40,
        isActive: true
      },
      response: {
        id: "sub-1",
        etapaFenologicaId: "etapa-1",
        name: "Cuajado avanzado",
        sortOrder: 2,
        description: "Actualizado",
        percentage: 40,
        isActive: true
      }
    },
    {
      name: "plagas y enfermedades",
      create: () =>
        agriculturalCatalogsService.createPlagaEnfermedad(session, {
          scientificName: "Oidium mangiferae",
          name: "Oidium",
          type: "enfermedad",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updatePlagaEnfermedad(session, "plaga-1", {
          scientificName: "Oidium sp.",
          name: "Oidium actualizado",
          type: "enfermedad",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deletePlagaEnfermedad(session, "plaga-1"),
      createPath: "/plagas-enfermedades",
      updatePath: "/plagas-enfermedades/plaga-1",
      deletePath: "/plagas-enfermedades/plaga-1",
      createBody: {
        scientificName: "Oidium mangiferae",
        name: "Oidium",
        type: "enfermedad",
        isActive: true
      },
      updateBody: {
        scientificName: "Oidium sp.",
        name: "Oidium actualizado",
        type: "enfermedad",
        isActive: true
      },
      response: {
        id: "plaga-1",
        scientificName: "Oidium sp.",
        name: "Oidium actualizado",
        type: "enfermedad",
        isActive: true
      }
    },
    {
      name: "relacion plaga etapa nivel",
      create: () =>
        agriculturalCatalogsService.createPlagaEnfermedadEtapaNivel(session, {
          plagaEnfermedadId: "plaga-1",
          etapaFenologicaId: "etapa-1",
          nivelIncidenciaSeveridadId: "3",
          description: "Baja incidencia",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updatePlagaEnfermedadEtapaNivel(session, "rel-1", {
          plagaEnfermedadId: "plaga-1",
          etapaFenologicaId: "etapa-1",
          nivelIncidenciaSeveridadId: "4",
          description: "Mayor severidad",
          isActive: true
        }),
      remove: () =>
        agriculturalCatalogsService.deletePlagaEnfermedadEtapaNivel(session, "rel-1"),
      createPath: "/plagas-enfermedades-etapas-niveles",
      updatePath: "/plagas-enfermedades-etapas-niveles/rel-1",
      deletePath: "/plagas-enfermedades-etapas-niveles/rel-1",
      createBody: {
        plagaEnfermedadId: "plaga-1",
        etapaFenologicaId: "etapa-1",
        nivelIncidenciaSeveridadId: 3,
        description: "Baja incidencia",
        isActive: true
      },
      updateBody: {
        plagaEnfermedadId: "plaga-1",
        etapaFenologicaId: "etapa-1",
        nivelIncidenciaSeveridadId: 4,
        description: "Mayor severidad",
        isActive: true
      },
      response: {
        id: "rel-1",
        plagaEnfermedadId: "plaga-1",
        etapaFenologicaId: "etapa-1",
        nivelIncidenciaSeveridadId: 4,
        description: "Mayor severidad",
        isActive: true
      }
    },
    {
      name: "nutrientes",
      create: () =>
        agriculturalCatalogsService.createNutrient(session, {
          cultivoId: "cultivo-1",
          name: "Nitrogeno",
          description: "Crecimiento",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateNutrient(session, "nut-1", {
          cultivoId: "cultivo-1",
          name: "Nitrogeno actualizado",
          description: "Actualizado",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteNutrient(session, "nut-1"),
      createPath: "/nutrientes",
      updatePath: "/nutrientes/nut-1",
      deletePath: "/nutrientes/nut-1",
      createBody: {
        cultivoId: "cultivo-1",
        name: "Nitrogeno",
        description: "Crecimiento",
        isActive: true
      },
      updateBody: {
        cultivoId: "cultivo-1",
        name: "Nitrogeno actualizado",
        description: "Actualizado",
        isActive: true
      },
      response: {
        id: "nut-1",
        cultivoId: "cultivo-1",
        name: "Nitrogeno actualizado",
        description: "Actualizado",
        isActive: true,
        details: []
      }
    },
    {
      name: "detalle nutrientes",
      create: () =>
        agriculturalCatalogsService.createNutrientDetail(session, {
          nutrientId: "nut-1",
          name: "Deficiencia leve",
          description: "Color verde claro",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateNutrientDetail(session, "det-1", {
          nutrientId: "nut-1",
          name: "Deficiencia moderada",
          description: "Amarillamiento",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteNutrientDetail(session, "det-1"),
      createPath: "/detalle-nutrientes",
      updatePath: "/detalle-nutrientes/det-1",
      deletePath: "/detalle-nutrientes/det-1",
      createBody: {
        nutrientId: "nut-1",
        name: "Deficiencia leve",
        description: "Color verde claro",
        isActive: true
      },
      updateBody: {
        nutrientId: "nut-1",
        name: "Deficiencia moderada",
        description: "Amarillamiento",
        isActive: true
      },
      response: {
        id: "det-1",
        nutrientId: "nut-1",
        name: "Deficiencia moderada",
        description: "Amarillamiento",
        isActive: true
      }
    },
    {
      name: "tipos de riego",
      create: () =>
        agriculturalCatalogsService.createTipoRiego(session, {
          name: "Goteo",
          description: "Tecnificado",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateTipoRiego(session, "riego-1", {
          name: "Goteo actualizado",
          description: "Actualizado",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteTipoRiego(session, "riego-1"),
      createPath: "/tipos-riego",
      updatePath: "/tipos-riego/riego-1",
      deletePath: "/tipos-riego/riego-1",
      createBody: { name: "Goteo", description: "Tecnificado", isActive: true },
      updateBody: {
        name: "Goteo actualizado",
        description: "Actualizado",
        isActive: true
      },
      response: {
        id: "riego-1",
        name: "Goteo actualizado",
        description: "Actualizado",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-17T00:00:00.000Z"
      }
    },
    {
      name: "labores culturales",
      create: () =>
        agriculturalCatalogsService.createLaborCultural(session, {
          name: "Poda",
          description: "Mantenimiento",
          isActive: true
        }),
      update: () =>
        agriculturalCatalogsService.updateLaborCultural(session, "labor-1", {
          name: "Poda sanitaria",
          description: "Actualizada",
          isActive: true
        }),
      remove: () => agriculturalCatalogsService.deleteLaborCultural(session, "labor-1"),
      createPath: "/labores-culturales",
      updatePath: "/labores-culturales/labor-1",
      deletePath: "/labores-culturales/labor-1",
      createBody: { name: "Poda", description: "Mantenimiento", isActive: true },
      updateBody: {
        name: "Poda sanitaria",
        description: "Actualizada",
        isActive: true
      },
      response: {
        id: "labor-1",
        name: "Poda sanitaria",
        description: "Actualizada",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-17T00:00:00.000Z"
      }
    }
  ])("uses correct create/update/delete requests for $name", async (crudCase) => {
    fetchMock.mockResolvedValue(apiResponse(crudCase.response));

    await crudCase.create();
    expectLastRequest(fetchMock, {
      path: crudCase.createPath,
      method: "POST",
      body: crudCase.createBody
    });

    await crudCase.update();
    expectLastRequest(fetchMock, {
      path: crudCase.updatePath,
      method: "PATCH",
      body: crudCase.updateBody
    });

    await crudCase.remove();
    expectLastRequest(fetchMock, {
      path: crudCase.deletePath,
      method: "DELETE"
    });
  });
});
