import { describe, expect, it, vi } from "vitest";

import { visitaRecetasService } from "./visita-recetas.service";

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  getPestDiseases: vi.fn(),
  getIncidenceLevels: vi.fn(),
  getByVisitaLocalId: vi.fn()
}));

vi.mock("../../visitas-campo/repositories/visitas-campo.repository", () => ({
  visitasCampoRepository: {
    getById: mocks.getById
  }
}));

vi.mock(
  "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository",
  () => ({
    observacionesSanitariasRepository: {
      getPestDiseases: mocks.getPestDiseases,
      getIncidenceLevels: mocks.getIncidenceLevels,
      getByVisitaLocalId: mocks.getByVisitaLocalId
    }
  })
);

vi.mock("../repositories/visita-recetas.repository", () => ({
  visitaRecetasRepository: {
    getCoadyuvantes: vi.fn(() => []),
    getIngredientesActivos: vi.fn(() => []),
    getMarcasProducto: vi.fn(() => []),
    getModosAccion: vi.fn(() => []),
    getTiposControl: vi.fn(() => []),
    getTiposProducto: vi.fn(() => []),
    getFertilizantes: vi.fn(() => []),
    getRecetaByVisitaLocalId: vi.fn(() => null),
    saveReceta: vi.fn()
  }
}));

vi.mock("./visita-recetas.remote", () => ({
  visitaRecetasRemote: {
    getConsolidacion: vi.fn(),
    save: vi.fn()
  }
}));

describe("visitaRecetasService", () => {
  it("builds local fitosanidad consolidation from step 2 observations", () => {
    mocks.getById.mockReturnValue({
      id: "visita-local-1",
      phenologicalStageId: "stage-1"
    });
    mocks.getPestDiseases.mockReturnValue([
      {
        id: "pest-1",
        scientificName: null,
        name: "Trips",
        type: "plaga",
        isActive: true
      },
      {
        id: "disease-1",
        scientificName: null,
        name: "Oidio",
        type: "enfermedad",
        isActive: true
      }
    ]);
    mocks.getIncidenceLevels.mockReturnValue([
      { id: "inc-1", name: "Baja", sortOrder: 1, type: "incidencia" },
      { id: "sev-1", name: "Leve", sortOrder: 1, type: "severidad" }
    ]);
    mocks.getByVisitaLocalId.mockReturnValue([
      {
        id: "obs-1",
        serverId: null,
        syncStatus: "pending",
        visitaId: "visita-local-1",
        pestDiseaseId: "pest-1",
        incidenceLevelId: "inc-1",
        severityLevelId: "sev-1",
        incidencePercentage: null,
        observation: null,
        organosAfectados: ["hoja_tierna"],
        createdAt: "2026-06-19T00:00:00.000Z",
        updatedAt: "2026-06-19T00:00:00.000Z"
      },
      {
        id: "obs-2",
        serverId: null,
        syncStatus: "pending",
        visitaId: "visita-local-1",
        pestDiseaseId: "disease-1",
        incidenceLevelId: null,
        severityLevelId: "sev-1",
        incidencePercentage: "12",
        observation: null,
        organosAfectados: ["hoja_madura"],
        createdAt: "2026-06-19T00:01:00.000Z",
        updatedAt: "2026-06-19T00:01:00.000Z"
      }
    ]);

    const result = visitaRecetasService.getConsolidacionLocal("visita-local-1");

    expect(result.plagas).toEqual([
      {
        nombre: "Trips",
        incidencia: "Baja",
        severidad: "Leve",
        organos: ["hoja_tierna"]
      }
    ]);
    expect(result.enfermedades).toEqual([
      {
        nombre: "Oidio",
        incidencia: "12%",
        severidad: "Leve",
        organos: ["hoja_madura"]
      }
    ]);
  });
});
