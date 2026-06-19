import { NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import type { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import type { VisitaEvaluacionEntity } from "../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import type { VisitaRiegoEntity } from "../../visita-riegos/infrastructure/persistence/entities/visita-riego.entity";
import type { VisitaLaborCulturalEntity } from "../../visita-labores-culturales/infrastructure/persistence/entities/visita-labor-cultural.entity";
import { VisitaRecetasConsolidacionService } from "./visita-recetas-consolidacion.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findOne: vi.fn()
  };
}

function makeVisita(etapa?: { name: string }, subEtapa?: { percentage?: string }) {
  return {
    id: "10",
    etapaFenologica: etapa ?? null,
    subEtapa: subEtapa ?? null,
    subEtapaPercentage: null
  } as unknown as VisitaCampoEntity;
}

function makeObservacionSanitaria(
  overrides: Partial<{
    type: string;
    name: string;
    incidencia: string;
    severidad: string;
    organos: string[];
  }> = {}
) {
  return {
    plagaEnfermedad: {
      type: overrides.type ?? "plaga",
      name: overrides.name ?? "Thrips"
    },
    nivelIncidencia: { name: overrides.incidencia ?? "Grado 2" },
    nivelSeveridad: { name: overrides.severidad ?? "Grado 1" },
    organosAfectados: (overrides.organos ?? ["Panicula"]).map(
      (o) => ({ organo: o })
    )
  } as unknown as VisitaObservacionSanitariaEntity;
}

function makeEvaluacion(desc: string, incPct: string, pct: string) {
  return {
    description: desc,
    incidencePercentage: incPct,
    percentage: pct,
    order: 3001
  } as VisitaEvaluacionEntity;
}

function makeRiego(humedad: string | null, estres: boolean | null) {
  return {
    humedadSuelo: humedad,
    estresHidrico: estres
  } as VisitaRiegoEntity;
}

function makeLaborCultural(name: string, category: string) {
  return {
    laborCultural: {
      name,
      categoryName: category
    }
  } as unknown as VisitaLaborCulturalEntity;
}

describe("VisitaRecetasConsolidacionService", () => {
  let visitaRepo: RepoMock;
  let obsSanitariaRepo: RepoMock;
  let evaluacionRepo: RepoMock;
  let riegoRepo: RepoMock;
  let laborRepo: RepoMock;
  let service: VisitaRecetasConsolidacionService;

  beforeEach(() => {
    visitaRepo = makeRepo();
    obsSanitariaRepo = makeRepo();
    evaluacionRepo = makeRepo();
    riegoRepo = makeRepo();
    laborRepo = makeRepo();
    service = new VisitaRecetasConsolidacionService(
      visitaRepo as unknown as Repository<VisitaCampoEntity>,
      obsSanitariaRepo as unknown as Repository<VisitaObservacionSanitariaEntity>,
      evaluacionRepo as unknown as Repository<VisitaEvaluacionEntity>,
      riegoRepo as unknown as Repository<VisitaRiegoEntity>,
      laborRepo as unknown as Repository<VisitaLaborCulturalEntity>
    );
  });

  it("throws NotFoundException when visita does not exist", async () => {
    visitaRepo.findOne.mockResolvedValue(null);

    await expect(service.getConsolidacion("999")).rejects.toThrow(
      NotFoundException
    );
  });

  it("returns etapa fenologica from visita relations", async () => {
    visitaRepo.findOne.mockResolvedValue(
      makeVisita({ name: "Floracion" }, { percentage: "45%" })
    );
    obsSanitariaRepo.find.mockResolvedValue([]);
    evaluacionRepo.find.mockResolvedValue([]);
    riegoRepo.findOne.mockResolvedValue(null);
    laborRepo.find.mockResolvedValue([]);

    const result = await service.getConsolidacion("10");

    expect(result.data.etapaFenologica).toBe("Floracion (45%)");
  });

  it("returns etapa fenologica name only when no sub-etapa", async () => {
    visitaRepo.findOne.mockResolvedValue(
      makeVisita({ name: "Maduracion" })
    );
    obsSanitariaRepo.find.mockResolvedValue([]);
    evaluacionRepo.find.mockResolvedValue([]);
    riegoRepo.findOne.mockResolvedValue(null);
    laborRepo.find.mockResolvedValue([]);

    const result = await service.getConsolidacion("10");

    expect(result.data.etapaFenologica).toBe("Maduracion");
  });

  it("classifies observaciones into plagas and enfermedades", async () => {
    visitaRepo.findOne.mockResolvedValue(makeVisita());
    obsSanitariaRepo.find.mockResolvedValue([
      makeObservacionSanitaria({ type: "plaga", name: "Thrips", incidencia: "Grado 2", severidad: "Grado 1", organos: ["Panicula"] }),
      makeObservacionSanitaria({ type: "enfermedad", name: "Muerte regresiva", incidencia: "2%", severidad: "Leve", organos: ["Fruto"] })
    ]);
    evaluacionRepo.find.mockResolvedValue([]);
    riegoRepo.findOne.mockResolvedValue(null);
    laborRepo.find.mockResolvedValue([]);

    const result = await service.getConsolidacion("10");

    expect(result.data.plagas).toHaveLength(1);
    expect(result.data.plagas[0].nombre).toBe("Thrips");
    expect(result.data.enfermedades).toHaveLength(1);
    expect(result.data.enfermedades[0].nombre).toBe("Muerte regresiva");
  });

  it("extracts nutrition data from evaluaciones prefixed with 'Nutricion -'", async () => {
    visitaRepo.findOne.mockResolvedValue(makeVisita());
    obsSanitariaRepo.find.mockResolvedValue([]);
    evaluacionRepo.find.mockResolvedValue([
      makeEvaluacion("Nutricion - Potasio", "15", "10"),
      makeEvaluacion("Not nutrition", "5", "3")
    ]);
    riegoRepo.findOne.mockResolvedValue(null);
    laborRepo.find.mockResolvedValue([]);

    const result = await service.getConsolidacion("10");

    expect(result.data.nutricion).toHaveLength(1);
    expect(result.data.nutricion[0].elemento).toBe("Potasio");
    expect(result.data.nutricion[0].incidencia).toBe("15%");
  });

  it("returns riego data with humedad and estres", async () => {
    visitaRepo.findOne.mockResolvedValue(makeVisita());
    obsSanitariaRepo.find.mockResolvedValue([]);
    evaluacionRepo.find.mockResolvedValue([]);
    riegoRepo.findOne.mockResolvedValue(makeRiego("saturado", true));
    laborRepo.find.mockResolvedValue([]);

    const result = await service.getConsolidacion("10");

    expect(result.data.riego.humedadSuelo).toBe("saturado");
    expect(result.data.riego.estresHidrico).toBe(true);
  });

  it("returns labores with name and category", async () => {
    visitaRepo.findOne.mockResolvedValue(makeVisita());
    obsSanitariaRepo.find.mockResolvedValue([]);
    evaluacionRepo.find.mockResolvedValue([]);
    riegoRepo.findOne.mockResolvedValue(null);
    laborRepo.find.mockResolvedValue([
      makeLaborCultural("Infestacion de maleza", "Manejo de malezas"),
      makeLaborCultural("Riesgo de quiebre", "Soporte estructural")
    ]);

    const result = await service.getConsolidacion("10");

    expect(result.data.labores).toHaveLength(2);
    expect(result.data.labores[0].nombre).toBe("Infestacion de maleza");
    expect(result.data.labores[1].categoria).toBe("Soporte estructural");
  });

  it("returns empty arrays when no observaciones found", async () => {
    visitaRepo.findOne.mockResolvedValue(makeVisita());
    obsSanitariaRepo.find.mockResolvedValue([]);
    evaluacionRepo.find.mockResolvedValue([]);
    riegoRepo.findOne.mockResolvedValue(null);
    laborRepo.find.mockResolvedValue([]);

    const result = await service.getConsolidacion("10");

    expect(result.data.plagas).toEqual([]);
    expect(result.data.enfermedades).toEqual([]);
    expect(result.data.nutricion).toEqual([]);
    expect(result.data.labores).toEqual([]);
    expect(result.data.riego.humedadSuelo).toBeNull();
  });
});
