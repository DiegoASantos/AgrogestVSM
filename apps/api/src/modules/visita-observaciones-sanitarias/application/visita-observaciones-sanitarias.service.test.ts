import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { VisitaObservacionesSanitariasService } from "./visita-observaciones-sanitarias.service";

function buildFixture() {
  const visit = { id: "visit-1", etapaFenologicaId: "stage-1" };
  const disease = { id: "disease-1", type: "enfermedad" };
  const incidenceLevels = [0, 1, 2, 3].map((grade) => ({
    id: 10 + grade,
    type: "incidencia",
    grade
  }));
  const severity = { id: 22, type: "severidad", grade: 2 };
  const stageLevels = [...incidenceLevels, severity].map((level, index) => ({
    id: index + 1,
    nivelIncidenciaSeveridad: level
  }));
  const saved = {
    id: "observation-1",
    visitaId: visit.id,
    plagaEnfermedadId: disease.id,
    nivelIncidenciaId: 12,
    nivelSeveridadId: severity.id,
    incidencePercentage: "12",
    observation: null,
    organosAfectados: []
  };
  const observations = {
    findOne: vi.fn().mockResolvedValueOnce(null).mockResolvedValue(saved),
    create: vi.fn((value) => value),
    merge: vi.fn((current, changes) => ({ ...current, ...changes })),
    save: vi.fn((value) => Promise.resolve({ ...value, id: saved.id }))
  };
  const visits = { findOne: vi.fn().mockResolvedValue(visit) };
  const diseases = { findOne: vi.fn().mockResolvedValue(disease) };
  const levels = { findOne: vi.fn().mockResolvedValue(severity) };
  const diseaseStageLevels = {
    findOne: vi.fn().mockResolvedValue({ id: "stage-relation" }),
    find: vi.fn().mockResolvedValue(stageLevels)
  };
  const organs = {
    delete: vi.fn().mockResolvedValue(undefined),
    create: vi.fn((value) => value),
    save: vi.fn().mockResolvedValue(undefined)
  };
  const service = new VisitaObservacionesSanitariasService(
    observations as never,
    visits as never,
    diseases as never,
    levels as never,
    diseaseStageLevels as never,
    organs as never
  );

  return { service, observations, diseaseStageLevels, organs, severity };
}

describe("VisitaObservacionesSanitariasService enfermedades", () => {
  it("exige el porcentaje de árboles enfermos", async () => {
    const { service } = buildFixture();

    await expect(
      service.create("visit-1", {
        pestDiseaseId: "disease-1",
        incidenceLevelId: 11,
        severityLevelId: null,
        organosAfectados: []
      })
    ).rejects.toThrow(
      new BadRequestException("El porcentaje de árboles enfermos es obligatorio.")
    );
  });

  it("normaliza a 0 el grado cero enviado por un cliente anterior", async () => {
    const { service, observations, organs } = buildFixture();

    await service.create("visit-1", {
      pestDiseaseId: "disease-1",
      incidenceLevelId: 10,
      severityLevelId: 22,
      incidencePercentage: null,
      organosAfectados: ["hoja_madura"]
    });

    expect(observations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nivelIncidenciaId: 10,
        nivelSeveridadId: null,
        incidencePercentage: "0"
      })
    );
    expect(organs.delete).toHaveBeenCalled();
    expect(organs.save).not.toHaveBeenCalled();
  });

  it("deriva la incidencia desde el porcentaje y no acepta el grado enviado", async () => {
    const { service, observations, severity } = buildFixture();

    await service.create("visit-1", {
      pestDiseaseId: "disease-1",
      incidenceLevelId: 10,
      severityLevelId: severity.id,
      incidencePercentage: 12,
      organosAfectados: ["hoja_madura"]
    });

    expect(observations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nivelIncidenciaId: 12,
        nivelSeveridadId: severity.id,
        incidencePercentage: "12"
      })
    );
  });

  it("rechaza una severidad ajena a la enfermedad y etapa", async () => {
    const { service, diseaseStageLevels } = buildFixture();
    diseaseStageLevels.find.mockResolvedValue(
      [0, 1, 2, 3].map((grade, index) => ({
        id: index + 1,
        nivelIncidenciaSeveridad: {
          id: 10 + grade,
          type: "incidencia",
          grade
        }
      }))
    );

    await expect(
      service.create("visit-1", {
        pestDiseaseId: "disease-1",
        severityLevelId: 22,
        incidencePercentage: 12,
        organosAfectados: ["hoja_madura"]
      })
    ).rejects.toThrow(
      "El nivel de severidad no está disponible para esta enfermedad y etapa fenológica."
    );
  });

  it("vacía severidad y órganos al actualizar una enfermedad a 0%", async () => {
    const { service, observations, organs, severity } = buildFixture();
    const existing = {
      id: "observation-1",
      visitaId: "visit-1",
      plagaEnfermedadId: "disease-1",
      nivelIncidenciaId: 12,
      nivelSeveridadId: severity.id,
      incidencePercentage: "12",
      observation: null,
      organosAfectados: [{ organo: "hoja_madura" }]
    };
    observations.findOne.mockReset().mockResolvedValue(existing);

    await service.update("observation-1", { incidencePercentage: 0 });

    expect(observations.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nivelIncidenciaId: 10,
        nivelSeveridadId: null,
        incidencePercentage: "0"
      })
    );
    expect(organs.delete).toHaveBeenCalledWith({
      visitaObservacionSanitariaId: "observation-1"
    });
    expect(organs.save).not.toHaveBeenCalled();
  });
});
