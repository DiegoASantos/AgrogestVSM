import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { VisitaEvaluacionesService } from "./visita-evaluaciones.service";

function buildService() {
  const evaluations = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((value) => ({ id: "evaluation-1", ...value })),
    save: vi.fn(async (value) => value)
  };
  const visits = {
    findOne: vi.fn().mockResolvedValue({ id: "visit-1", cultivoId: "crop-1" })
  };
  const nutrients = {
    findOne: vi.fn().mockResolvedValue({
      id: "nutrient-1",
      cultivoId: "crop-1",
      isActive: true
    })
  };

  return {
    service: new VisitaEvaluacionesService(
      evaluations as never,
      visits as never,
      nutrients as never
    ),
    evaluations
  };
}

describe("VisitaEvaluacionesService - Nutrición", () => {
  it("exige el porcentaje de árboles afectados en cada deficiencia evaluada", async () => {
    const { service } = buildService();

    await expect(
      service.create("visit-1", {
        nutrientId: "nutrient-1",
        order: 3001,
        description: "Nutricion - Nitrogeno: Incidencia",
        organosAfectados: []
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reconoce la evaluación nutricional por nutrientId aunque cambie el texto", async () => {
    const { service } = buildService();

    await expect(
      service.create("visit-1", {
        nutrientId: "nutrient-1",
        order: 3001,
        description: "Deficiencia de nitrogeno",
        organosAfectados: []
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([-1, 101, 1.5])("rechaza el porcentaje %s", async (percentage) => {
    const { service } = buildService();

    await expect(
      service.create("visit-1", {
        nutrientId: "nutrient-1",
        order: 3001,
        incidencePercentage: percentage,
        description: "Nutricion - Nitrogeno: Incidencia",
        organosAfectados: []
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("guarda un entero de 0 a 100 vinculado al nutriente del cultivo", async () => {
    const { service, evaluations } = buildService();

    const response = await service.create("visit-1", {
      nutrientId: "nutrient-1",
      order: 3001,
      incidencePercentage: 5,
      description: "Nutricion - Nitrogeno: Incidencia 5%",
      organosAfectados: ["hoja_tierna"]
    });

    expect(evaluations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nutrientId: "nutrient-1",
        incidencePercentage: "5"
      })
    );
    expect(response.data).toMatchObject({
      nutrientId: "nutrient-1",
      incidencePercentage: "5"
    });
  });

  it("conserva hoja tierna cuando la incidencia nutricional es cero", async () => {
    const { service, evaluations } = buildService();

    const response = await service.create("visit-1", {
      nutrientId: "nutrient-1",
      order: 3001,
      incidencePercentage: 0,
      description: "Nutricion - Nitrogeno: Incidencia 0%",
      organosAfectados: ["hoja_tierna"]
    });

    expect(evaluations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        incidencePercentage: "0",
        organosAfectados: ["hoja_tierna"]
      })
    );
    expect(response.data).toMatchObject({
      incidencePercentage: "0",
      organosAfectados: ["hoja_tierna"]
    });
  });

  it("sigue aceptando un arreglo de organos vacio con incidencia cero", async () => {
    const { service, evaluations } = buildService();

    await service.create("visit-1", {
      nutrientId: "nutrient-1",
      order: 3001,
      incidencePercentage: 0,
      description: "Nutricion - Nitrogeno: Incidencia 0%",
      organosAfectados: []
    });

    expect(evaluations.create).toHaveBeenCalledWith(
      expect.objectContaining({ organosAfectados: [] })
    );
  });
});
