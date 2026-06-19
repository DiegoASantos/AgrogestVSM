import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaEvaluacion } from "../../evaluaciones/types";
import type { VisitaLaborCultural } from "../../labores-culturales-visita/types";
import type {
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../observaciones-sanitarias/types";
import type { VisitaRiego } from "../../riegos/types";

const now = "2026-06-17T15:00:00.000Z";

let evaluationState: VisitaEvaluacion[];
let sanitaryState: VisitaObservacionSanitaria[];
let stepNoteState: VisitaStepNote | null;
let riegoState: VisitaRiego | null;
let laborState: VisitaLaborCultural[];

const evaluacionesInsert = vi.fn(
  (
    input: { order: number; percentage?: number; description: string },
    visitaId: string
  ) => {
    const evaluation: VisitaEvaluacion = {
      id: "eval-1",
      serverId: null,
      syncStatus: "pending",
      visitaId,
      order: input.order,
      incidencePercentage: null,
      percentage: input.percentage === undefined ? null : String(input.percentage),
      description: input.description,
      organosAfectados: [],
      createdAt: now,
      updatedAt: now
    };
    evaluationState.push(evaluation);
    return evaluation;
  }
);
const evaluacionesUpdate = vi.fn(
  (id: string, input: Partial<Pick<VisitaEvaluacion, "order" | "description">>) => {
    const existing = evaluationState.find((evaluation) => evaluation.id === id);

    if (!existing) {
      throw new Error("No evaluation");
    }

    Object.assign(existing, input, { updatedAt: now });
    return existing;
  }
);
const evaluacionesDeleteById = vi.fn((id: string) => {
  evaluationState = evaluationState.filter((evaluation) => evaluation.id !== id);
});
const evaluacionesGetByVisitaLocalId = vi.fn((visitaId: string) =>
  evaluationState.filter((evaluation) => evaluation.visitaId === visitaId)
);

vi.mock("../../evaluaciones/repositories/evaluaciones.repository", () => ({
  evaluacionesRepository: {
    insert: evaluacionesInsert,
    update: evaluacionesUpdate,
    deleteById: evaluacionesDeleteById,
    getByVisitaLocalId: evaluacionesGetByVisitaLocalId
  }
}));

const observacionesInsert = vi.fn(
  (
    input: {
      pestDiseaseId: string;
      incidenceLevelId?: string | null;
      observation?: string;
      organosAfectados: VisitaObservacionSanitaria["organosAfectados"];
    },
    visitaId: string
  ) => {
    const observation: VisitaObservacionSanitaria = {
      id: "obs-1",
      serverId: null,
      syncStatus: "pending",
      visitaId,
      pestDiseaseId: input.pestDiseaseId,
      incidenceLevelId: input.incidenceLevelId ?? null,
      severityLevelId: null,
      incidencePercentage: null,
      observation: input.observation ?? null,
      organosAfectados: input.organosAfectados,
      createdAt: now,
      updatedAt: now
    };
    sanitaryState.push(observation);
    return observation;
  }
);
const observacionesUpdate = vi.fn(
  (id: string, input: Partial<VisitaObservacionSanitaria>) => {
    const existing = sanitaryState.find((observation) => observation.id === id);

    if (!existing) {
      throw new Error("No sanitary observation");
    }

    Object.assign(existing, input, { updatedAt: now });
    return existing;
  }
);
const observacionesDeleteById = vi.fn((id: string) => {
  sanitaryState = sanitaryState.filter((observation) => observation.id !== id);
});
const observacionesGetByVisitaLocalId = vi.fn((visitaId: string) =>
  sanitaryState.filter((observation) => observation.visitaId === visitaId)
);

vi.mock(
  "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository",
  () => ({
    observacionesSanitariasRepository: {
      insert: observacionesInsert,
      update: observacionesUpdate,
      deleteById: observacionesDeleteById,
      getByVisitaLocalId: observacionesGetByVisitaLocalId
    }
  })
);

const stepNotesUpsert = vi.fn(
  (
    visitaId: string,
    stepNumber: number,
    input: { observation?: string | null; recommendation?: string | null }
  ) => {
    stepNoteState = {
      id: stepNoteState?.id ?? "step-note-1",
      serverId: null,
      syncStatus: "pending",
      visitaId,
      stepNumber,
      observation: input.observation ?? null,
      recommendation: input.recommendation ?? null,
      createdAt: stepNoteState?.createdAt ?? now,
      updatedAt: now
    };
    return stepNoteState;
  }
);
const stepNotesGetByVisitaAndStep = vi.fn((visitaId: string, stepNumber: number) =>
  stepNoteState?.visitaId === visitaId && stepNoteState.stepNumber === stepNumber
    ? stepNoteState
    : null
);

vi.mock(
  "../../observaciones-sanitarias/repositories/visita-step-notes.repository",
  () => ({
    visitaStepNotesRepository: {
      upsert: stepNotesUpsert,
      getByVisitaAndStep: stepNotesGetByVisitaAndStep
    }
  })
);

const riegosGetByVisitaLocalId = vi.fn((visitaId: string) =>
  riegoState?.visitaId === visitaId ? riegoState : null
);
const riegosInsert = vi.fn(
  (
    input: {
      tipoRiegoId: string;
      fuenteAgua?: VisitaRiego["fuenteAgua"];
      tipoSuelo?: VisitaRiego["tipoSuelo"];
      humedadSuelo?: VisitaRiego["humedadSuelo"];
      estresHidrico?: VisitaRiego["estresHidrico"];
    },
    visitaId: string
  ) => {
    riegoState = {
      id: "riego-1",
      serverId: null,
      syncStatus: "pending",
      visitaId,
      tipoRiegoId: input.tipoRiegoId,
      fuenteAgua: input.fuenteAgua ?? null,
      tipoSuelo: input.tipoSuelo ?? null,
      humedadSuelo: input.humedadSuelo ?? null,
      estresHidrico: input.estresHidrico ?? null,
      createdAt: now,
      updatedAt: now
    };
    return riegoState;
  }
);
const riegosUpdate = vi.fn((id: string, input: Partial<VisitaRiego>) => {
  if (!riegoState || riegoState.id !== id) {
    throw new Error("No riego");
  }

  riegoState = { ...riegoState, ...input, updatedAt: now };
  return riegoState;
});

vi.mock("../../riegos/repositories/riegos.repository", () => ({
  riegosRepository: {
    getByVisitaLocalId: riegosGetByVisitaLocalId,
    insert: riegosInsert,
    update: riegosUpdate
  }
}));

const laboresGetByVisitaLocalId = vi.fn((visitaId: string) =>
  laborState.filter((labor) => labor.visitaId === visitaId)
);
const laboresInsert = vi.fn((input: { laborCulturalId: string }, visitaId: string) => {
  const labor: VisitaLaborCultural = {
    id: `labor-${input.laborCulturalId}`,
    serverId: null,
    syncStatus: "pending",
    visitaId,
    laborCulturalId: input.laborCulturalId,
    createdAt: now,
    updatedAt: now
  };
  laborState.push(labor);
  return labor;
});
const laboresDeleteById = vi.fn((id: string) => {
  laborState = laborState.filter((labor) => labor.id !== id);
});

vi.mock(
  "../../labores-culturales-visita/repositories/labores-culturales-visita.repository",
  () => ({
    laboresCulturalesVisitaRepository: {
      getByVisitaLocalId: laboresGetByVisitaLocalId,
      insert: laboresInsert,
      deleteById: laboresDeleteById
    }
  })
);

const { evaluacionesService } =
  await import("../../evaluaciones/services/evaluaciones.service");
const { observacionesSanitariasService } =
  await import("../../observaciones-sanitarias/services/observaciones-sanitarias.service");
const { riegosService } = await import("../../riegos/services/riegos.service");
const { laboresCulturalesVisitaService } =
  await import("../../labores-culturales-visita/services/labores-culturales-visita.service");

describe("mobile local CRUD services", () => {
  beforeEach(() => {
    evaluationState = [];
    sanitaryState = [];
    stepNoteState = null;
    riegoState = null;
    laborState = [];
    vi.clearAllMocks();
  });

  it("creates, updates and removes visit evaluations", async () => {
    const created = await evaluacionesService.create("visita-1", {
      order: 1,
      percentage: 40,
      description: "Evaluacion inicial"
    });

    expect(created).toMatchObject({
      visitaId: "visita-1",
      order: 1,
      percentage: "40"
    });
    expect(evaluacionesInsert).toHaveBeenCalledWith(
      {
        order: 1,
        percentage: 40,
        description: "Evaluacion inicial"
      },
      "visita-1"
    );

    const updated = await evaluacionesService.update("eval-1", {
      order: 2,
      description: "Evaluacion editada"
    });

    expect(updated).toMatchObject({
      id: "eval-1",
      order: 2,
      description: "Evaluacion editada"
    });

    await evaluacionesService.remove("eval-1");

    expect(evaluacionesDeleteById).toHaveBeenCalledWith("eval-1");
    expect(evaluationState).toEqual([]);
  });

  it("creates, updates and removes sanitary observations and upserts step notes", async () => {
    const created = await observacionesSanitariasService.create("visita-1", {
      pestDiseaseId: "pest-1",
      incidenceLevelId: "level-1",
      observation: "Sintomas leves",
      organosAfectados: ["hoja_tierna", "fruto_verde"]
    });

    expect(created).toMatchObject({
      visitaId: "visita-1",
      pestDiseaseId: "pest-1",
      organosAfectados: ["hoja_tierna", "fruto_verde"]
    });

    const updated = await observacionesSanitariasService.update("obs-1", {
      observation: "Sintomas actualizados",
      organosAfectados: ["tronco_rama"]
    });

    expect(updated).toMatchObject({
      id: "obs-1",
      observation: "Sintomas actualizados",
      organosAfectados: ["tronco_rama"]
    });

    const stepNote = await observacionesSanitariasService.upsertStepNote("visita-1", 2, {
      observation: "Observacion sanitaria",
      recommendation: "Revisar en siguiente visita"
    });

    expect(stepNote).toMatchObject({
      visitaId: "visita-1",
      stepNumber: 2,
      recommendation: "Revisar en siguiente visita"
    });

    await observacionesSanitariasService.remove("obs-1");

    expect(observacionesDeleteById).toHaveBeenCalledWith("obs-1");
    expect(sanitaryState).toEqual([]);
  });

  it("inserts, updates and avoids duplicate writes for riego selection", async () => {
    const created = await riegosService.saveSelection("visita-1", {
      tipoRiegoId: "riego-1",
      fuenteAgua: "subterranea",
      tipoSuelo: "franco",
      humedadSuelo: "optimo",
      estresHidrico: false
    });

    expect(created).toMatchObject({
      visitaId: "visita-1",
      tipoRiegoId: "riego-1",
      fuenteAgua: "subterranea",
      tipoSuelo: "franco",
      humedadSuelo: "optimo",
      estresHidrico: false
    });
    expect(riegosInsert).toHaveBeenCalledOnce();

    await riegosService.saveSelection("visita-1", {
      tipoRiegoId: "riego-1",
      fuenteAgua: "subterranea",
      tipoSuelo: "franco",
      humedadSuelo: "optimo",
      estresHidrico: false
    });

    expect(riegosUpdate).toHaveBeenCalled();

    const updated = await riegosService.saveSelection("visita-1", {
      tipoRiegoId: "riego-2",
      fuenteAgua: "subterranea",
      tipoSuelo: "franco",
      humedadSuelo: "optimo",
      estresHidrico: false
    });

    expect(updated).toMatchObject({ tipoRiegoId: "riego-2" });
    expect(riegosUpdate).toHaveBeenCalledWith("riego-1", {
      tipoRiegoId: "riego-2",
      fuenteAgua: "subterranea",
      tipoSuelo: "franco",
      humedadSuelo: "optimo",
      estresHidrico: false
    });
  });

  it("adds new labor selections and removes unselected ones", async () => {
    laborState = [
      {
        id: "labor-labor-1",
        serverId: null,
        syncStatus: "pending",
        visitaId: "visita-1",
        laborCulturalId: "labor-1",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "labor-labor-2",
        serverId: null,
        syncStatus: "pending",
        visitaId: "visita-1",
        laborCulturalId: "labor-2",
        createdAt: now,
        updatedAt: now
      }
    ];

    const result = await laboresCulturalesVisitaService.saveSelections("visita-1", [
      "labor-2",
      "labor-3"
    ]);

    expect(laboresDeleteById).toHaveBeenCalledWith("labor-labor-1");
    expect(laboresInsert).toHaveBeenCalledWith(
      { laborCulturalId: "labor-3" },
      "visita-1"
    );
    expect(result.map((labor) => labor.laborCulturalId)).toEqual(["labor-2", "labor-3"]);
  });
});
