import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaEvaluacion } from "../../evaluaciones/types";
import type { VisitaLaborCultural } from "../../labores-culturales-visita/types";
import type {
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../observaciones-sanitarias/types";
import type { VisitaRiego } from "../../riegos/types";
import type { CreateVisitaCampoDraft, VisitaCampo } from "../types";

const now = "2026-06-17T12:00:00.000Z";

let idSequence = 0;
let visitaState: VisitaCampo | null = null;
let evaluacionState: VisitaEvaluacion[] = [];
let observacionState: VisitaObservacionSanitaria[] = [];
let stepNoteState: VisitaStepNote[] = [];
let riegoState: VisitaRiego | null = null;
let laborState: VisitaLaborCultural[] = [];

function nextId(prefix: string) {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

const visitasCampoInsert = vi.fn(
  (input: CreateVisitaCampoDraft & { agronomistUserId: string }) => {
    visitaState = {
      id: "visita-local-1",
      serverId: null,
      syncStatus: "pending",
      publicId: input.publicId ?? "visita-public-1",
      nroFicha: null,
      cropId: input.cropId,
      varietyId: input.varietyId,
      parcelaId: input.parcelaId,
      campaignId: input.campaignId,
      agronomistUserId: input.agronomistUserId,
      plantsCount: input.plantsCount ?? null,
      areaHectares: input.areaHectares ?? null,
      sowingDate: input.sowingDate ?? null,
      visitDate: input.visitDate,
      startVisitTime: input.startVisitTime,
      endVisitTime: input.endVisitTime ?? null,
      phenologicalStageId: input.phenologicalStageId ?? null,
      subEtapaId: input.subEtapaId ?? null,
      subEtapaPercentage: input.subEtapaPercentage ?? null,
      generalObservation: input.generalObservation ?? null,
      agronomistSignatureName: null,
      producerSignatureName: null,
      visitLocation: input.visitLocation ?? null,
      synchronizedAt: null,
      syncErrorMessage: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      recetaAnteriorJson: null
    };

    return visitaState;
  }
);
const visitasCampoGetById = vi.fn((localId: string) =>
  visitaState?.id === localId ? visitaState : null
);
const visitasCampoUpdate = vi.fn();

vi.mock("../repositories/visitas-campo.repository", () => ({
  visitasCampoRepository: {
    insert: visitasCampoInsert,
    getById: visitasCampoGetById,
    update: visitasCampoUpdate
  }
}));

const evaluacionesInsert = vi.fn(
  (
    input: { order: number; percentage?: number; description: string },
    visitaLocalId: string
  ) => {
    const evaluacion: VisitaEvaluacion = {
      id: nextId("evaluacion"),
      serverId: null,
      syncStatus: "pending",
      visitaId: visitaLocalId,
      order: input.order,
      incidencePercentage: null,
      percentage: input.percentage === undefined ? null : String(input.percentage),
      description: input.description,
      organosAfectados: [],
      createdAt: now,
      updatedAt: now
    };
    evaluacionState.push(evaluacion);
    return evaluacion;
  }
);
const evaluacionesGetByVisitaLocalId = vi.fn((visitaLocalId: string) =>
  evaluacionState.filter((evaluacion) => evaluacion.visitaId === visitaLocalId)
);
const evaluacionesGetById = vi.fn(
  (localId: string) =>
    evaluacionState.find((evaluacion) => evaluacion.id === localId) ?? null
);
const evaluacionesUpdate = vi.fn();

vi.mock("../../evaluaciones/repositories/evaluaciones.repository", () => ({
  evaluacionesRepository: {
    insert: evaluacionesInsert,
    getByVisitaLocalId: evaluacionesGetByVisitaLocalId,
    getById: evaluacionesGetById,
    update: evaluacionesUpdate
  }
}));

const observacionesInsert = vi.fn(
  (
    input: {
      pestDiseaseId: string;
      incidenceLevelId?: string | null;
      severityLevelId?: string | null;
      observation?: string;
      organosAfectados: VisitaObservacionSanitaria["organosAfectados"];
    },
    visitaLocalId: string
  ) => {
    const observacion: VisitaObservacionSanitaria = {
      id: nextId("observacion"),
      serverId: null,
      syncStatus: "pending",
      visitaId: visitaLocalId,
      pestDiseaseId: input.pestDiseaseId,
      incidenceLevelId: input.incidenceLevelId ?? null,
      severityLevelId: input.severityLevelId ?? null,
      incidencePercentage: null,
      observation: input.observation ?? null,
      organosAfectados: input.organosAfectados,
      createdAt: now,
      updatedAt: now
    };
    observacionState.push(observacion);
    return observacion;
  }
);
const observacionesGetByVisitaLocalId = vi.fn((visitaLocalId: string) =>
  observacionState.filter((observacion) => observacion.visitaId === visitaLocalId)
);
const observacionesGetById = vi.fn(
  (localId: string) =>
    observacionState.find((observacion) => observacion.id === localId) ?? null
);
const observacionesUpdate = vi.fn();

vi.mock(
  "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository",
  () => ({
    observacionesSanitariasRepository: {
      insert: observacionesInsert,
      getByVisitaLocalId: observacionesGetByVisitaLocalId,
      getById: observacionesGetById,
      update: observacionesUpdate
    }
  })
);

const visitaStepNotesUpsert = vi.fn(
  (
    visitaLocalId: string,
    stepNumber: number,
    input: { observation?: string | null; recommendation?: string | null }
  ) => {
    const existing = stepNoteState.find(
      (stepNote) =>
        stepNote.visitaId === visitaLocalId && stepNote.stepNumber === stepNumber
    );

    if (existing) {
      existing.observation = input.observation ?? null;
      existing.recommendation = input.recommendation ?? null;
      existing.updatedAt = now;
      return existing;
    }

    const stepNote: VisitaStepNote = {
      id: nextId("step-note"),
      serverId: null,
      syncStatus: "pending",
      visitaId: visitaLocalId,
      stepNumber,
      observation: input.observation ?? null,
      recommendation: input.recommendation ?? null,
      createdAt: now,
      updatedAt: now
    };
    stepNoteState.push(stepNote);
    return stepNote;
  }
);
const visitaStepNotesGetByVisitaAndStep = vi.fn(
  (visitaLocalId: string, stepNumber: number) =>
    stepNoteState.find(
      (stepNote) =>
        stepNote.visitaId === visitaLocalId && stepNote.stepNumber === stepNumber
    ) ?? null
);
const visitaStepNotesGetById = vi.fn(
  (localId: string) => stepNoteState.find((stepNote) => stepNote.id === localId) ?? null
);
const visitaStepNotesUpdate = vi.fn();

vi.mock(
  "../../observaciones-sanitarias/repositories/visita-step-notes.repository",
  () => ({
    visitaStepNotesRepository: {
      upsert: visitaStepNotesUpsert,
      getByVisitaAndStep: visitaStepNotesGetByVisitaAndStep,
      getById: visitaStepNotesGetById,
      update: visitaStepNotesUpdate
    }
  })
);

const riegoGetByVisitaLocalId = vi.fn((visitaLocalId: string) =>
  riegoState?.visitaId === visitaLocalId ? riegoState : null
);
const riegoInsert = vi.fn((input: { tipoRiegoId: string }, visitaLocalId: string) => {
  riegoState = {
    id: "riego-local-1",
    serverId: null,
    syncStatus: "pending",
    visitaId: visitaLocalId,
    tipoRiegoId: input.tipoRiegoId,
    fuenteAgua: null,
    tipoSuelo: null,
    humedadSuelo: null,
    estresHidrico: null,
    createdAt: now,
    updatedAt: now
  };
  return riegoState;
});
const riegoUpdate = vi.fn();
const riegoGetById = vi.fn((localId: string) =>
  riegoState?.id === localId ? riegoState : null
);

vi.mock("../../riegos/repositories/riegos.repository", () => ({
  riegosRepository: {
    getByVisitaLocalId: riegoGetByVisitaLocalId,
    insert: riegoInsert,
    update: riegoUpdate,
    getById: riegoGetById
  }
}));

const laboresGetByVisitaLocalId = vi.fn((visitaLocalId: string) =>
  laborState.filter((labor) => labor.visitaId === visitaLocalId)
);
const laboresInsert = vi.fn(
  (input: { laborCulturalId: string }, visitaLocalId: string) => {
    const labor: VisitaLaborCultural = {
      id: nextId("labor"),
      serverId: null,
      syncStatus: "pending",
      visitaId: visitaLocalId,
      laborCulturalId: input.laborCulturalId,
      createdAt: now,
      updatedAt: now
    };
    laborState.push(labor);
    return labor;
  }
);
const laboresDeleteById = vi.fn((localId: string) => {
  laborState = laborState.filter((labor) => labor.id !== localId);
});
const laboresUpdate = vi.fn();
const laboresGetById = vi.fn(
  (localId: string) => laborState.find((labor) => labor.id === localId) ?? null
);

vi.mock(
  "../../labores-culturales-visita/repositories/labores-culturales-visita.repository",
  () => ({
    laboresCulturalesVisitaRepository: {
      getByVisitaLocalId: laboresGetByVisitaLocalId,
      insert: laboresInsert,
      deleteById: laboresDeleteById,
      update: laboresUpdate,
      getById: laboresGetById
    }
  })
);

const nutrientesByCrop = vi.fn((cropId: string) =>
  cropId === "crop-mango"
    ? [
        {
          id: "nutriente-n",
          cultivoId: cropId,
          name: "Nitrogeno",
          description: "Crecimiento vegetativo",
          isActive: true,
          details: [
            {
              id: "detalle-n-1",
              nutrientId: "nutriente-n",
              name: "Deficiencia leve",
              description: "Coloracion verde clara",
              isActive: true
            }
          ]
        }
      ]
    : []
);

vi.mock("../../nutricion/repositories", () => ({
  nutricionRepository: {
    getNutrientsByCrop: nutrientesByCrop
  }
}));

vi.mock("../../../shared/utils/auth-token", () => ({
  getUserIdFromAccessToken: () => "agronomist-user-1"
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => ({
    runSync: vi.fn(),
    withTransactionSync: (callback: () => void) => callback()
  })
}));

vi.mock("../../../shared/database/sync-outbox", () => ({
  getPendingOutboxEntries: () => [],
  insertSyncOutboxEntry: vi.fn()
}));

vi.mock("../../../shared/database/sqlite-utils", () => ({
  getNowIsoString: () => now
}));

vi.mock("../../../shared/utils/debug-log", () => ({
  debugLog: vi.fn()
}));

const { visitasCampoService } = await import("./visitas-campo.service");
const { evaluacionesService } =
  await import("../../evaluaciones/services/evaluaciones.service");
const { observacionesSanitariasService } =
  await import("../../observaciones-sanitarias/services/observaciones-sanitarias.service");
const { riegosService } = await import("../../riegos/services/riegos.service");
const { laboresCulturalesVisitaService } =
  await import("../../labores-culturales-visita/services/labores-culturales-visita.service");
const { nutricionService } = await import("../../nutricion/services/nutricion.service");

describe("visita de campo complete flow", () => {
  beforeEach(() => {
    idSequence = 0;
    visitaState = null;
    evaluacionState = [];
    observacionState = [];
    stepNoteState = [];
    riegoState = null;
    laborState = [];
    vi.clearAllMocks();
  });

  it("records each visit step and exposes a complete detail with pending sync summary", async () => {
    const visita = await visitasCampoService.create(
      {
        publicId: "visita-public-1",
        cropId: "crop-mango",
        varietyId: "variety-kent",
        parcelaId: "parcela-001",
        campaignId: "campaign-2026",
        plantsCount: 120,
        areaHectares: "1.75",
        sowingDate: "2025-09-15",
        visitDate: "2026-06-17",
        startVisitTime: "08:00",
        endVisitTime: "10:30",
        phenologicalStageId: "stage-floracion",
        subEtapaId: "substage-cuajado",
        subEtapaPercentage: 35,
        generalObservation: "Visita completa de preproduccion.",
        visitLocation: {
          type: "Point",
          coordinates: [-80.6328, -5.1945]
        }
      },
      { accessToken: "signed-token" }
    );

    await evaluacionesService.create(visita.id, {
      order: 1,
      percentage: 40,
      description: "Evaluacion de brotamiento uniforme."
    });
    await evaluacionesService.create(visita.id, {
      order: 2,
      percentage: 60,
      description: "Evaluacion de fructificacion inicial."
    });

    await observacionesSanitariasService.create(visita.id, {
      pestDiseaseId: "pest-oidium",
      incidenceLevelId: "incidence-low",
      observation: "Se observan sintomas leves en hojas y fruto verde.",
      organosAfectados: ["hoja_tierna", "fruto_verde"]
    });

    for (const stepNumber of [1, 2, 3, 4, 5, 6]) {
      await observacionesSanitariasService.upsertStepNote(visita.id, stepNumber, {
        observation: `Observacion paso ${stepNumber}`,
        recommendation: `Recomendacion paso ${stepNumber}`
      });
    }

    const nutrientes = nutricionService.getNutrientsByCrop(visita.cropId);
    await riegosService.saveSelection(visita.id, {
      tipoRiegoId: "riego-goteo",
      fuenteAgua: "subterranea",
      tipoSuelo: "franco",
      humedadSuelo: "optimo",
      estresHidrico: false
    });
    await laboresCulturalesVisitaService.saveSelections(visita.id, [
      "labor-poda",
      "labor-limpieza"
    ]);

    const detail = await visitasCampoService.getFullDetail(visita.id);
    const syncSummary = visitasCampoService.getVisitaSyncSummary(visita.id);

    expect(visitasCampoInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cropId: "crop-mango",
        parcelaId: "parcela-001",
        agronomistUserId: "agronomist-user-1"
      })
    );
    expect(detail.visita).toMatchObject({
      id: "visita-local-1",
      cropId: "crop-mango",
      phenologicalStageId: "stage-floracion",
      syncStatus: "pending"
    });
    expect(detail.evaluaciones).toHaveLength(2);
    expect(detail.evaluaciones.map((evaluacion) => evaluacion.order)).toEqual([1, 2]);
    expect(detail.observacionesSanitarias).toHaveLength(1);
    expect(detail.observacionesSanitarias[0]).toMatchObject({
      pestDiseaseId: "pest-oidium",
      organosAfectados: ["hoja_tierna", "fruto_verde"]
    });
    expect(detail.stepNotes).toHaveLength(6);
    expect(detail.riego).toMatchObject({ tipoRiegoId: "riego-goteo" });
    expect(detail.laboresCulturales.map((labor) => labor.laborCulturalId)).toEqual([
      "labor-poda",
      "labor-limpieza"
    ]);
    expect(nutrientes).toHaveLength(1);
    expect(nutrientes[0]?.details[0]?.name).toBe("Deficiencia leve");
    expect(syncSummary).toEqual({
      overallStatus: "pending",
      totalEntities: 13,
      syncedCount: 0,
      pendingCount: 13,
      errorCount: 0
    });
  });

  it("reports partial sync when the visit is synced but child records remain pending", async () => {
    const visita = await visitasCampoService.create(
      {
        cropId: "crop-mango",
        varietyId: "variety-kent",
        parcelaId: "parcela-001",
        campaignId: "campaign-2026",
        visitDate: "2026-06-17",
        startVisitTime: "08:00"
      },
      { accessToken: "signed-token" }
    );
    visita.syncStatus = "synced";

    await evaluacionesService.create(visita.id, {
      order: 1,
      description: "Evaluacion pendiente de sincronizar."
    });
    await riegosService.saveSelection(visita.id, {
      tipoRiegoId: "riego-goteo",
      fuenteAgua: "subterranea",
      tipoSuelo: "franco",
      humedadSuelo: "optimo",
      estresHidrico: false
    });

    expect(visitasCampoService.getVisitaSyncSummary(visita.id)).toEqual({
      overallStatus: "partial",
      totalEntities: 3,
      syncedCount: 1,
      pendingCount: 2,
      errorCount: 0
    });
  });
});
