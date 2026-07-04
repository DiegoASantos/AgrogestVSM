import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaEvaluacion } from "../../modules/evaluaciones/types";
import type { VisitaLaborCultural } from "../../modules/labores-culturales-visita/types";
import type {
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../modules/observaciones-sanitarias/types";
import type { VisitaRiego } from "../../modules/riegos/types";
import type { VisitaRecetaCompleta } from "../../modules/visita-recetas/types";
import type { VisitaCampo } from "../../modules/visitas-campo/types";
import type { SyncOutboxItem } from "../database/sync-outbox";

const now = "2026-06-17T14:00:00.000Z";

let apiToken: string | null = null;
let pendingOutbox: SyncOutboxItem[] = [];
let visita: VisitaCampo;
let evaluacion: VisitaEvaluacion;
let observacion: VisitaObservacionSanitaria;
let stepNote: VisitaStepNote;
let riego: VisitaRiego;
let labor: VisitaLaborCultural;
let receta: VisitaRecetaCompleta;

const getPendingOutboxEntries = vi.fn(() => pendingOutbox);
const deleteOutboxEntry = vi.fn((id: number) => {
  pendingOutbox = pendingOutbox.filter((entry) => entry.id !== id);
});
const incrementOutboxRetryCount = vi.fn((id: number) => {
  pendingOutbox = pendingOutbox.map((entry) =>
    entry.id === id ? { ...entry, retryCount: entry.retryCount + 1 } : entry
  );
});

vi.mock("../database/sync-outbox", () => ({
  getPendingOutboxEntries,
  deleteOutboxEntry,
  incrementOutboxRetryCount
}));

const runSync = vi.fn();
const getAllSync = vi.fn(() => []);
vi.mock("../database/connection", () => ({
  getDatabase: () => ({ runSync, getAllSync })
}));

vi.mock("../database/sqlite-utils", () => ({
  getNowIsoString: () => now
}));

const getApiToken = vi.fn(() => apiToken);
vi.mock("../services/api/auth-store", () => ({
  getApiToken: () => getApiToken()
}));

vi.mock("../services/api/errors", async () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public readonly statusCode?: number,
      public readonly details?: unknown,
      public readonly responseData?: unknown
    ) {
      super(message);
      this.name = "ApiError";
    }
  }

  return {
    ApiError,
    toApiError(error: unknown) {
      if (error instanceof ApiError) return error;
      if (error instanceof Error) return new ApiError(error.message);
      return new ApiError("Unexpected API error.");
    }
  };
});

vi.mock("../services", async () => {
  const errors = await import("../services/api/errors");
  return errors;
});

vi.mock("../utils/debug-log", () => ({
  debugLog: vi.fn()
}));

const setLastSyncTime = vi.fn();
vi.mock("./sync-status", () => ({
  setLastSyncTime: (...args: unknown[]) => setLastSyncTime(...args)
}));

vi.mock("../utils/local-id", () => ({
  generatePublicId: () => "550e8400-e29b-41d4-a716-446655440999",
  isUuid: (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value
    )
}));

const visitasCampoGetById = vi.fn((localId: string) =>
  visita.id === localId ? visita : null
);
const visitasCampoUpdate = vi.fn((localId: string, data: Partial<VisitaCampo>) => {
  if (visita.id === localId) {
    visita = { ...visita, ...data, updatedAt: now };
  }
  return visita;
});

vi.mock("../../modules/visitas-campo/repositories/visitas-campo.repository", () => ({
  visitasCampoRepository: {
    getById: visitasCampoGetById,
    update: visitasCampoUpdate
  }
}));

const evaluacionesGetById = vi.fn((localId: string) =>
  evaluacion.id === localId ? evaluacion : null
);
const evaluacionesUpdate = vi.fn((localId: string, data: Partial<VisitaEvaluacion>) => {
  if (evaluacion.id === localId) {
    evaluacion = { ...evaluacion, ...data, updatedAt: now };
  }
  return evaluacion;
});

vi.mock("../../modules/evaluaciones/repositories/evaluaciones.repository", () => ({
  evaluacionesRepository: {
    getById: evaluacionesGetById,
    update: evaluacionesUpdate
  }
}));

const observacionesGetById = vi.fn((localId: string) =>
  observacion.id === localId ? observacion : null
);
const observacionesUpdate = vi.fn(
  (localId: string, data: Partial<VisitaObservacionSanitaria>) => {
    if (observacion.id === localId) {
      observacion = { ...observacion, ...data, updatedAt: now };
    }
    return observacion;
  }
);

vi.mock(
  "../../modules/observaciones-sanitarias/repositories/observaciones-sanitarias.repository",
  () => ({
    observacionesSanitariasRepository: {
      getById: observacionesGetById,
      update: observacionesUpdate
    }
  })
);

const stepNotesGetById = vi.fn((localId: string) =>
  stepNote.id === localId ? stepNote : null
);
const stepNotesUpdate = vi.fn((localId: string, data: Partial<VisitaStepNote>) => {
  if (stepNote.id === localId) {
    stepNote = { ...stepNote, ...data, updatedAt: now };
  }
  return stepNote;
});

vi.mock(
  "../../modules/observaciones-sanitarias/repositories/visita-step-notes.repository",
  () => ({
    visitaStepNotesRepository: {
      getById: stepNotesGetById,
      update: stepNotesUpdate
    }
  })
);

const riegosGetById = vi.fn((localId: string) => (riego.id === localId ? riego : null));
const riegosUpdate = vi.fn((localId: string, data: Partial<VisitaRiego>) => {
  if (riego.id === localId) {
    riego = { ...riego, ...data, updatedAt: now };
  }
  return riego;
});

vi.mock("../../modules/riegos/repositories/riegos.repository", () => ({
  riegosRepository: {
    getById: riegosGetById,
    update: riegosUpdate
  }
}));

const laboresGetById = vi.fn((localId: string) => (labor.id === localId ? labor : null));
const laboresUpdate = vi.fn((localId: string, data: Partial<VisitaLaborCultural>) => {
  if (labor.id === localId) {
    labor = { ...labor, ...data, updatedAt: now };
  }
  return labor;
});

vi.mock(
  "../../modules/labores-culturales-visita/repositories/labores-culturales-visita.repository",
  () => ({
    laboresCulturalesVisitaRepository: {
      getById: laboresGetById,
      update: laboresUpdate
    }
  })
);

const visitaRemoteCreate = vi.fn(async () => ({
  id: "server-visita-1",
  publicId: "550e8400-e29b-41d4-a716-446655440000"
}));
vi.mock("../../modules/visitas-campo/services/visitas-campo.remote", () => ({
  visitasCampoRemote: {
    create: visitaRemoteCreate,
    update: vi.fn(),
    remove: vi.fn()
  }
}));

const evaluacionRemoteCreate = vi.fn(async () => ({ id: "server-evaluacion-1" }));
vi.mock("../../modules/evaluaciones/services/evaluaciones.remote", () => ({
  evaluacionesRemote: {
    create: evaluacionRemoteCreate,
    update: vi.fn(),
    remove: vi.fn()
  }
}));

const observacionRemoteCreate = vi.fn(async () => ({ id: "server-observacion-1" }));
const stepNoteRemoteUpsert = vi.fn(async () => ({ id: "server-step-note-2" }));
vi.mock(
  "../../modules/observaciones-sanitarias/services/observaciones-sanitarias.remote",
  () => ({
    observacionesSanitariasRemote: {
      create: observacionRemoteCreate,
      update: vi.fn(),
      remove: vi.fn(),
      upsertStepNote: stepNoteRemoteUpsert
    }
  })
);

const riegoRemoteCreate = vi.fn(async () => ({ id: "server-riego-1" }));
vi.mock("../../modules/riegos/services/riegos.remote", () => ({
  riegosRemote: {
    create: riegoRemoteCreate,
    update: vi.fn(),
    remove: vi.fn()
  }
}));

const laborRemoteCreate = vi.fn(async () => ({ id: "server-labor-1" }));
vi.mock(
  "../../modules/labores-culturales-visita/services/labores-culturales-visita.remote",
  () => ({
    laboresCulturalesVisitaRemote: {
      create: laborRemoteCreate,
      remove: vi.fn()
    }
  })
);

const recetaGetByLocalId = vi.fn((localId: string) =>
  receta.id === localId ? receta : null
);
const recetaGetByVisitaLocalId = vi.fn((visitaLocalId: string) =>
  receta.visitaLocalId === visitaLocalId ? receta : null
);
const recetaMarkSynced = vi.fn((recetaLocalId: string, serverId: string | null) => {
  if (receta.id === recetaLocalId) {
    receta = {
      ...receta,
      serverId,
      syncStatus: "synced",
      fitosanidad: receta.fitosanidad.map((item) => ({
        ...item,
        syncStatus: "synced"
      })),
      fertilizacion: receta.fertilizacion.map((item) => ({
        ...item,
        syncStatus: "synced"
      })),
      riego: receta.riego ? { ...receta.riego, syncStatus: "synced" } : null,
      labores: receta.labores.map((item) => ({
        ...item,
        syncStatus: "synced"
      }))
    };
  }
});
vi.mock("../../modules/visita-recetas/repositories/visita-recetas.repository", () => ({
  visitaRecetasRepository: {
    getRecetaByLocalId: recetaGetByLocalId,
    getRecetaByVisitaLocalId: recetaGetByVisitaLocalId,
    markSynced: recetaMarkSynced
  }
}));

const recetaRemoteSave = vi.fn(async () => ({ id: "server-receta-1" }));
vi.mock("../../modules/visita-recetas/services/visita-recetas.remote", () => ({
  visitaRecetasRemote: {
    save: recetaRemoteSave
  }
}));

const { processOutbox } = await import("./sync-engine");

function makeOutboxEntry(
  id: number,
  entityType: SyncOutboxItem["entityType"],
  entityLocalId: string
): SyncOutboxItem {
  return {
    id,
    entityType,
    entityLocalId,
    operation: "create",
    payload: null,
    retryCount: 0,
    createdAt: now
  };
}

function seedOfflineCompleteVisit() {
  visita = {
    id: "visita-local-1",
    serverId: null,
    syncStatus: "pending",
    publicId: "550e8400-e29b-41d4-a716-446655440000",
    nroFicha: null,
    cropId: "1",
    varietyId: "2",
    parcelaId: "3",
    campaignId: "4",
    agronomistUserId: "agronomist-1",
    plantsCount: 120,
    areaHectares: "1.75",
    sowingDate: "2025-09-15",
    visitDate: "2026-06-17",
    startVisitTime: "08:00",
    endVisitTime: "10:30",
    phenologicalStageId: "5",
    subEtapaId: "6",
    subEtapaPercentage: 35,
    generalObservation: "Visita offline completa creada desde campo.",
    agronomistSignatureName: null,
    producerSignatureName: null,
    visitLocation: {
      type: "Point",
      coordinates: [-80.6328, -5.1945]
    },
    synchronizedAt: null,
    syncErrorMessage: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    recetaAnteriorJson: null
  };
  evaluacion = {
    id: "evaluacion-local-1",
    serverId: null,
    syncStatus: "pending",
    visitaId: visita.id,
    order: 1,
    incidencePercentage: null,
    percentage: "40",
    description: "Evaluacion vegetativa registrada sin conexion.",
    organosAfectados: [],
    createdAt: now,
    updatedAt: now
  };
  observacion = {
    id: "observacion-local-1",
    serverId: null,
    syncStatus: "pending",
    visitaId: visita.id,
    pestDiseaseId: "7",
    incidenceLevelId: "8",
    severityLevelId: "9",
    incidencePercentage: null,
    observation: "Sintomas leves en hoja y fruto verde.",
    organosAfectados: ["hoja_tierna", "fruto_verde"],
    createdAt: now,
    updatedAt: now
  };
  stepNote = {
    id: "step-note-local-2",
    serverId: null,
    syncStatus: "pending",
    visitaId: visita.id,
    stepNumber: 2,
    observation: "Observacion sanitaria general.",
    recommendation: "Monitorear evolucion en siguiente visita.",
    createdAt: now,
    updatedAt: now
  };
  riego = {
    id: "riego-local-1",
    serverId: null,
    syncStatus: "pending",
    visitaId: visita.id,
    tipoRiegoId: "10",
    fuenteAgua: null,
    tipoSuelo: null,
    humedadSuelo: null,
    estresHidrico: null,
    createdAt: now,
    updatedAt: now
  };
  labor = {
    id: "labor-local-1",
    serverId: null,
    syncStatus: "pending",
    visitaId: visita.id,
    laborCulturalId: "11",
    createdAt: now,
    updatedAt: now
  };
  receta = {
    id: "receta-local-1",
    serverId: null,
    visitaLocalId: visita.id,
    etapaFenologica: "Floracion",
    version: 1,
    syncStatus: "pending",
    syncErrorMessage: null,
    createdAt: now,
    updatedAt: now,
    fitosanidad: [
      {
        id: "receta-fito-local-1",
        serverId: null,
        recetaLocalId: "receta-local-1",
        numero: 1,
        objetivo: "plaga",
        objetivoNombre: "Trips",
        tipoControlId: "1",
        tipoProductoId: "2",
        disolvente: "agua",
        modoAccionId: "3",
        ingredienteActivoNombre: "Spinosad",
        dosisIa: 0.15,
        volumenAplicacion: 200,
        cantidadTotalIa: 30,
        marcaProductoNombre: "Producto X",
        concentracionProducto: 120,
        cantidadTotalProducto: 0.25,
        coadyuvantesIds: null,
        ordenMezcla: null,
        syncStatus: "pending",
        createdAt: now,
        updatedAt: now
      }
    ],
    fertilizacion: [],
    riego: {
      id: "receta-riego-local-1",
      serverId: null,
      recetaLocalId: "receta-local-1",
      tipoRecomendacion: "riego_ligero",
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now
    },
    labores: []
  };
  pendingOutbox = [
    makeOutboxEntry(1, "visitas_campo", visita.id),
    makeOutboxEntry(2, "visita_evaluaciones", evaluacion.id),
    makeOutboxEntry(3, "visita_observaciones_sanitarias", observacion.id),
    makeOutboxEntry(4, "visita_paso_observaciones", stepNote.id),
    makeOutboxEntry(5, "visita_riegos", riego.id),
    makeOutboxEntry(6, "visita_labores_culturales", labor.id),
    makeOutboxEntry(7, "visita_recetas", receta.id)
  ];
}

describe("offline/online sync with complete visit data", () => {
  beforeEach(() => {
    apiToken = null;
    seedOfflineCompleteVisit();
    vi.clearAllMocks();
  });

  it("keeps locally queued visit data untouched while offline/no token is available", async () => {
    const result = await processOutbox();

    expect(result).toEqual({ processed: 0, skipped: 0, errors: 0 });
    expect(getPendingOutboxEntries).not.toHaveBeenCalled();
    expect(deleteOutboxEntry).not.toHaveBeenCalled();
    expect(visitaRemoteCreate).not.toHaveBeenCalled();
    expect(pendingOutbox).toHaveLength(7);
    expect(visita.serverId).toBeNull();
    expect(evaluacion.syncStatus).toBe("pending");
  });

  it("syncs a full offline visit when connection/token returns and clears the outbox", async () => {
    apiToken = "token-online";

    const result = await processOutbox();

    expect(result).toEqual({ processed: 7, skipped: 0, errors: 0 });
    expect(pendingOutbox).toEqual([]);
    expect(setLastSyncTime).toHaveBeenCalledWith(now);

    expect(visitaRemoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        cropId: "1",
        parcelaId: "3",
        visitDate: "2026-06-17",
        publicId: "550e8400-e29b-41d4-a716-446655440000"
      }),
      { accessToken: "token-online" }
    );
    expect(evaluacionRemoteCreate).toHaveBeenCalledWith("server-visita-1", {
      order: 1,
      incidencePercentage: null,
      percentage: 40,
      description: "Evaluacion vegetativa registrada sin conexion.",
      organosAfectados: []
    });
    expect(observacionRemoteCreate).toHaveBeenCalledWith("server-visita-1", {
      pestDiseaseId: "7",
      incidenceLevelId: 8,
      severityLevelId: 9,
      incidencePercentage: null,
      observation: "Sintomas leves en hoja y fruto verde.",
      organosAfectados: ["hoja_tierna", "fruto_verde"]
    });
    expect(stepNoteRemoteUpsert).toHaveBeenCalledWith("server-visita-1", 2, {
      observation: "Observacion sanitaria general.",
      recommendation: "Monitorear evolucion en siguiente visita."
    });
    expect(riegoRemoteCreate).toHaveBeenCalledWith("server-visita-1", {
      tipoRiegoId: 10,
      fuenteAgua: null,
      tipoSuelo: null,
      humedadSuelo: null,
      estresHidrico: null
    });
    expect(laborRemoteCreate).toHaveBeenCalledWith("server-visita-1", {
      laborCulturalId: 11
    });
    expect(recetaRemoteSave).toHaveBeenCalledWith(
      "server-visita-1",
      expect.objectContaining({
        etapaFenologica: "Floracion",
        fitosanidad: [
          expect.objectContaining({
            numero: 1,
            objetivo: "plaga",
            objetivoNombre: "Trips",
            tipoControlId: 1,
            tipoProductoId: 2
          })
        ],
        riego: { tipoRecomendacion: "riego_ligero" }
      })
    );

    expect(visita).toMatchObject({
      serverId: "server-visita-1",
      syncStatus: "synced",
      synchronizedAt: now
    });
    expect(evaluacion).toMatchObject({
      serverId: "server-evaluacion-1",
      syncStatus: "synced"
    });
    expect(observacion).toMatchObject({
      serverId: "server-observacion-1",
      syncStatus: "synced"
    });
    expect(stepNote).toMatchObject({
      serverId: "server-step-note-2",
      syncStatus: "synced"
    });
    expect(riego).toMatchObject({
      serverId: "server-riego-1",
      syncStatus: "synced"
    });
    expect(labor).toMatchObject({
      serverId: "server-labor-1",
      syncStatus: "synced"
    });
    expect(receta).toMatchObject({
      serverId: "server-receta-1",
      syncStatus: "synced",
      fitosanidad: [expect.objectContaining({ syncStatus: "synced" })],
      riego: expect.objectContaining({ syncStatus: "synced" })
    });
  });

  it("does not duplicate remote calls after a successful sync emptied the outbox", async () => {
    apiToken = "token-online";

    await processOutbox();
    vi.clearAllMocks();

    const result = await processOutbox();

    expect(result).toEqual({ processed: 0, skipped: 0, errors: 0 });
    expect(visitaRemoteCreate).not.toHaveBeenCalled();
    expect(evaluacionRemoteCreate).not.toHaveBeenCalled();
    expect(observacionRemoteCreate).not.toHaveBeenCalled();
    expect(stepNoteRemoteUpsert).not.toHaveBeenCalled();
    expect(riegoRemoteCreate).not.toHaveBeenCalled();
    expect(laborRemoteCreate).not.toHaveBeenCalled();
    expect(recetaRemoteSave).not.toHaveBeenCalled();
  });
});
