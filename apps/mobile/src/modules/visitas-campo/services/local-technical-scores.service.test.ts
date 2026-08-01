import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPestDiseases: vi.fn(),
  getIncidenceLevels: vi.fn(),
  getNutrientsByCrop: vi.fn(),
  getDepartmentCodeById: vi.fn(),
  getRecetaByVisitaLocalId: vi.fn(),
  getAllSync: vi.fn(),
  getRemoteObservations: vi.fn(),
  getRemoteEvaluations: vi.fn(),
  getRemoteRiego: vi.fn()
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => ({ getAllSync: mocks.getAllSync })
}));

vi.mock("../../nutricion/repositories/nutricion.repository", () => ({
  nutricionRepository: { getNutrientsByCrop: mocks.getNutrientsByCrop }
}));
vi.mock(
  "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository",
  () => ({
    observacionesSanitariasRepository: {
      getPestDiseases: mocks.getPestDiseases,
      getIncidenceLevels: mocks.getIncidenceLevels
    }
  })
);
vi.mock("../../parcelas/repositories/parcelas.repository", () => ({
  parcelasRepository: { getDepartmentCodeById: mocks.getDepartmentCodeById }
}));
vi.mock("../../visita-recetas/repositories/visita-recetas.repository", () => ({
  visitaRecetasRepository: {
    getRecetaByVisitaLocalId: mocks.getRecetaByVisitaLocalId
  }
}));
vi.mock(
  "../../observaciones-sanitarias/services/observaciones-sanitarias.remote",
  () => ({
    observacionesSanitariasRemote: { getByVisitaId: mocks.getRemoteObservations }
  })
);
vi.mock("../../evaluaciones/services/evaluaciones.remote", () => ({
  evaluacionesRemote: { getByVisitaId: mocks.getRemoteEvaluations }
}));
vi.mock("../../riegos/services/riegos.remote", () => ({
  riegosRemote: { getByVisitaId: mocks.getRemoteRiego }
}));

import type { VisitaCampoFull } from "../types";
import {
  hasLegacyTechnicalDeleteForVisit,
  localTechnicalScoresService,
  shouldConfirmTechnicalScoresFromServer
} from "./local-technical-scores.service";

const now = "2026-08-01T12:00:00.000Z";

function buildDetail(
  syncStatus: VisitaCampoFull["visita"]["syncStatus"] = "pending"
): VisitaCampoFull {
  return {
    visita: {
      id: "visit-local-1",
      serverId: syncStatus === "synced" ? "visit-server-1" : null,
      syncStatus,
      publicId: "visit-public-1",
      nroFicha: null,
      cropId: "crop-1",
      varietyId: "variety-1",
      parcelaId: "parcel-1",
      campaignId: "campaign-1",
      agronomistUserId: "user-1",
      plantsCount: null,
      areaHectares: null,
      sowingDate: null,
      visitDate: "2026-08-01",
      startVisitTime: "08:00",
      endVisitTime: "09:00",
      phenologicalStageId: null,
      subEtapaId: null,
      subEtapaPercentage: null,
      generalObservation: null,
      agronomistSignatureName: null,
      producerSignatureName: null,
      visitLocation: null,
      synchronizedAt: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      recetaAnteriorJson: null
    },
    evaluaciones: [],
    observacionesSanitarias: [],
    riego: null,
    laboresCulturales: [],
    stepNotes: []
  };
}

describe("localTechnicalScoresService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPestDiseases.mockReturnValue([]);
    mocks.getIncidenceLevels.mockReturnValue([]);
    mocks.getNutrientsByCrop.mockReturnValue([]);
    mocks.getDepartmentCodeById.mockReturnValue("20");
    mocks.getRecetaByVisitaLocalId.mockReturnValue(null);
    mocks.getAllSync.mockReturnValue([]);
    mocks.getRemoteObservations.mockResolvedValue([]);
    mocks.getRemoteEvaluations.mockResolvedValue([]);
    mocks.getRemoteRiego.mockResolvedValue(null);
  });

  it("muestra score 3 desde SQLite para una visita no sincronizada con receta", () => {
    mocks.getRecetaByVisitaLocalId.mockReturnValue({
      id: "recipe-local-1",
      serverId: null,
      visitaLocalId: "visit-local-1",
      etapaFenologica: null,
      version: 1,
      syncStatus: "pending",
      syncErrorMessage: null,
      createdAt: now,
      updatedAt: now,
      fitosanidad: [],
      fertilizacion: [],
      riego: null,
      labores: []
    });

    const result = localTechnicalScoresService.calculate(buildDetail());

    expect(result.pendingSync).toBe(true);
    expect(result.scores.detallePlagas?.moduleScore).toBe(3);
    expect(result.scores.detalleEnfermedades?.moduleScore).toBe(3);
    expect(result.scores.detalleNutricion?.moduleScore).toBe(3);
    expect(result.scores.detalleRiego?.moduleScore).toBe(3);
    expect(shouldConfirmTechnicalScoresFromServer(null, result.pendingSync)).toBe(false);
  });

  it("permite confirmar en API solamente cuando los datos tecnicos estan sincronizados", () => {
    const result = localTechnicalScoresService.calculate(buildDetail("synced"));

    expect(result.pendingSync).toBe(false);
    expect(shouldConfirmTechnicalScoresFromServer("visit-server-1", false)).toBe(true);
    expect(shouldConfirmTechnicalScoresFromServer("visit-server-1", true)).toBe(false);
  });

  it("no permite reemplazar el calculo local mientras exista un borrado tecnico", () => {
    mocks.getAllSync.mockReturnValue([
      {
        entity_type: "visita_evaluaciones",
        payload: JSON.stringify({ visitaId: "visit-local-1", serverId: "evaluation-1" })
      }
    ]);

    const result = localTechnicalScoresService.calculate(buildDetail("synced"));

    expect(result.pendingSync).toBe(true);
    expect(shouldConfirmTechnicalScoresFromServer("visit-server-1", true)).toBe(false);
  });

  it("resuelve un borrado legado por serverId sin atribuirlo globalmente", async () => {
    mocks.getAllSync.mockReturnValue([
      {
        entity_type: "visita_observaciones_sanitarias",
        payload: JSON.stringify({ serverId: "observation-legacy-1" })
      }
    ]);

    const result = localTechnicalScoresService.calculate(buildDetail("synced"));

    expect(result.pendingSync).toBe(false);
    expect(result.legacyDeletes).toEqual([
      {
        entityType: "visita_observaciones_sanitarias",
        serverId: "observation-legacy-1"
      }
    ]);
    expect(
      await hasLegacyTechnicalDeleteForVisit("visit-server-1", result.legacyDeletes)
    ).toBe(false);

    mocks.getRemoteObservations.mockResolvedValue([{ id: "observation-legacy-1" }]);
    expect(
      await hasLegacyTechnicalDeleteForVisit("visit-server-1", result.legacyDeletes)
    ).toBe(true);
  });

  it("conserva el calculo local si no puede resolver un borrado legado", async () => {
    mocks.getRemoteEvaluations.mockRejectedValue(new Error("sin red"));

    expect(
      await hasLegacyTechnicalDeleteForVisit("visit-server-1", [
        {
          entityType: "visita_evaluaciones",
          serverId: "evaluation-legacy-1"
        }
      ])
    ).toBe(true);
  });
});
