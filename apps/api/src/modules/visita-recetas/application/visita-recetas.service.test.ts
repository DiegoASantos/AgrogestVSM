import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaRecetasService } from "./visita-recetas.service";
import type { VisitaRecetaEntity } from "../infrastructure/persistence/entities/visita-receta.entity";
import type { VisitaRecetaFitosanidadEntity } from "../infrastructure/persistence/entities/visita-receta-fitosanidad.entity";
import type { VisitaRecetaFertilizacionEntity } from "../infrastructure/persistence/entities/visita-receta-fertilizacion.entity";
import type { VisitaRecetaRiegoEntity } from "../infrastructure/persistence/entities/visita-receta-riego.entity";
import type { VisitaRecetaLaborEntity } from "../infrastructure/persistence/entities/visita-receta-labor.entity";
import type { VisitaRecetaHistorialEntity } from "../infrastructure/persistence/entities/visita-receta-historial.entity";
import type { CreateVisitaRecetaDto } from "../presentation/dto/create-visita-receta.dto";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    delete: vi.fn()
  };
}

function makeReceta(overrides: Partial<VisitaRecetaEntity> = {}): VisitaRecetaEntity {
  return {
    id: "1",
    visitaId: "10",
    etapaFenologica: "Floracion (45%)",
    version: 1,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    fitosanidad: [],
    fertilizacion: [],
    riego: null,
    labores: [],
    ...overrides
  } as unknown as VisitaRecetaEntity;
}

function makeVisita(): VisitaCampoEntity {
  return { id: "10" } as VisitaCampoEntity;
}

function makeValidDto(): CreateVisitaRecetaDto {
  return {
    etapaFenologica: "Floracion (45%)",
    fitosanidad: [
      {
        numero: 1,
        objetivo: "plaga",
        objetivoNombre: "Thrips",
        tipoControlId: 1,
        tipoProductoId: 1,
        disolvente: "Agua",
        modoAccionId: 1,
        ingredienteActivoNombre: "Abamectina",
        dosisIa: 250,
        volumenAplicacion: 2,
        cantidadTotalIa: 500,
        marcaProductoNombre: "Agrimec",
        concentracionProducto: 18,
        cantidadTotalProducto: 27.78,
        coadyuvantesIds: "[1, 4]",
        ordenMezcla: '["Agua","Regulador de pH","Producto agroquimico","Adherente"]'
      }
    ],
    fertilizacion: [
      {
        viaAplicacion: "edafica",
        fertilizanteNombre: "Nitrato de potasio",
        tipoProducto: "solido",
        dosis: 0.5,
        unidadDosis: "Kg/planta",
        cantidadTotalPlantas: 1500,
        volumenAplicacion: undefined,
        cantidadTotalFertilizante: 750
      }
    ],
    riego: { tipoRecomendacion: "riego_pesado" },
    labores: [{ labor: "horqueteo" }, { labor: "enzunchado" }]
  };
}

describe("VisitaRecetasService", () => {
  let recetaRepo: RepoMock;
  let visitaRepo: RepoMock;
  let fitosanidadRepo: RepoMock;
  let fertilizacionRepo: RepoMock;
  let riegoRepo: RepoMock;
  let laborRepo: RepoMock;
  let historialRepo: RepoMock;
  let service: VisitaRecetasService;

  beforeEach(() => {
    recetaRepo = makeRepo();
    visitaRepo = makeRepo();
    fitosanidadRepo = makeRepo();
    fertilizacionRepo = makeRepo();
    riegoRepo = makeRepo();
    laborRepo = makeRepo();
    historialRepo = makeRepo();
    service = new VisitaRecetasService(
      recetaRepo as unknown as Repository<VisitaRecetaEntity>,
      visitaRepo as unknown as Repository<VisitaCampoEntity>,
      fitosanidadRepo as unknown as Repository<VisitaRecetaFitosanidadEntity>,
      fertilizacionRepo as unknown as Repository<VisitaRecetaFertilizacionEntity>,
      riegoRepo as unknown as Repository<VisitaRecetaRiegoEntity>,
      laborRepo as unknown as Repository<VisitaRecetaLaborEntity>,
      historialRepo as unknown as Repository<VisitaRecetaHistorialEntity>
    );
  });

  describe("save", () => {
    it("throws BadRequestException when visita does not exist", async () => {
      visitaRepo.findOne.mockResolvedValue(null);

      await expect(service.save("999", makeValidDto())).rejects.toThrow(
        BadRequestException
      );
    });

    it("creates a new receta when none exists for the visita", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      recetaRepo.findOne.mockResolvedValueOnce(null); // no existing
      recetaRepo.create.mockReturnValue(makeReceta());
      recetaRepo.save.mockResolvedValue(makeReceta());
      recetaRepo.findOne
        .mockResolvedValueOnce(null) // after create receta
        .mockResolvedValueOnce(makeReceta({ fitosanidad: [], fertilizacion: [], labores: [] })) // after fitosanidad
        .mockResolvedValueOnce(makeReceta({
          id: "1",
          fitosanidad: [{ id: "f1" } as VisitaRecetaFitosanidadEntity],
          fertilizacion: [{ id: "fe1" } as VisitaRecetaFertilizacionEntity],
          riego: { id: "r1" } as VisitaRecetaRiegoEntity,
          labores: [{ id: "l1" }, { id: "l2" }] as VisitaRecetaLaborEntity[]
        }));
      historialRepo.create.mockReturnValue({});
      historialRepo.save.mockResolvedValue({});

      const result = await service.save("10", makeValidDto());

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("findByVisitaId", () => {
    it("throws NotFoundException when visita does not exist", async () => {
      visitaRepo.findOne.mockResolvedValue(null);

      await expect(service.findByVisitaId("999")).rejects.toThrow(
        NotFoundException
      );
    });

    it("returns null when no receta exists for the visita", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      recetaRepo.findOne.mockResolvedValue(null);

      const result = await service.findByVisitaId("10");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("returns the receta with all relations", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      recetaRepo.findOne.mockResolvedValue(
        makeReceta({
          fitosanidad: [{ id: "f1", numero: 1, objetivo: "plaga", objetivoNombre: "Thrips" } as VisitaRecetaFitosanidadEntity],
          fertilizacion: [{ id: "fe1", viaAplicacion: "edafica" } as VisitaRecetaFertilizacionEntity],
          riego: { id: "r1", tipoRecomendacion: "riego_pesado" } as VisitaRecetaRiegoEntity,
          labores: [{ id: "l1", labor: "horqueteo" } as VisitaRecetaLaborEntity]
        })
      );

      const result = await service.findByVisitaId("10");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.fitosanidad).toHaveLength(1);
      expect(result.data!.fertilizacion).toHaveLength(1);
      expect(result.data!.riego).toBeDefined();
      expect(result.data!.labores).toHaveLength(1);
    });
  });

  describe("getHistorial", () => {
    it("returns empty array when no receta exists", async () => {
      recetaRepo.findOne.mockResolvedValue(null);

      const result = await service.getHistorial("10");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("returns version history ordered ascending", async () => {
      recetaRepo.findOne.mockResolvedValue(makeReceta({ id: "1" }));
      historialRepo.find.mockResolvedValue([
        { id: "h1", version: 1, snapshot: { etapaFenologica: "v1" }, createdAt: new Date("2025-01-01") },
        { id: "h2", version: 2, snapshot: { etapaFenologica: "v2" }, createdAt: new Date("2025-01-02") }
      ]);

      const result = await service.getHistorial("10");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].version).toBe(1);
      expect(result.data[1].version).toBe(2);
    });
  });
});
