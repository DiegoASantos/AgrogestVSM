import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import type { PlagaEnfermedadEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/plaga-enfermedad.entity";
import type { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import type { VisitaEvaluacionEntity } from "../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import type { NutrienteEntity } from "../../nutricion/infrastructure/persistence/entities/nutriente.entity";
import { VisitaRecetasService } from "./visita-recetas.service";
import type { VisitaRecetaEntity } from "../infrastructure/persistence/entities/visita-receta.entity";
import type { VisitaRecetaFitosanidadEntity } from "../infrastructure/persistence/entities/visita-receta-fitosanidad.entity";
import type { VisitaRecetaFertilizacionEntity } from "../infrastructure/persistence/entities/visita-receta-fertilizacion.entity";
import type { VisitaRecetaRiegoEntity } from "../infrastructure/persistence/entities/visita-receta-riego.entity";
import type { VisitaRecetaLaborEntity } from "../infrastructure/persistence/entities/visita-receta-labor.entity";
import type { VisitaRecetaHistorialEntity } from "../infrastructure/persistence/entities/visita-receta-historial.entity";
import type { VisitaRecetaMezclaEntity } from "../infrastructure/persistence/entities/visita-receta-mezcla.entity";
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
    mezclas: [],
    fertilizacion: [],
    riego: null,
    labores: [],
    ...overrides
  } as unknown as VisitaRecetaEntity;
}

function makeVisita(): VisitaCampoEntity {
  return {
    id: "10",
    cultivoId: "5",
    horaVisitaInicio: "08:00",
    horaVisitaFin: null
  } as VisitaCampoEntity;
}

function makeValidDto(): CreateVisitaRecetaDto {
  return {
    etapaFenologica: "Floracion (45%)",
    mezclas: [
      {
        numero: 1,
        coadyuvantesIds: "[1, 4]",
        ordenMezcla: '["Agua","Agrimec"]',
        volumenAplicacion: 2,
        factor: 1.2,
        factorEditable: false,
        productos: [
          {
            objetivo: "plaga",
            objetivoNombre: "Thrips",
            tipoControlId: 1,
            tipoProductoId: 1,
            disolvente: "Agua",
            modoAccionId: 1,
            ingredienteActivoNombre: "Abamectina",
            dosisProducto: 250,
            unidadDosis: "ml/cilindro",
            marcaProductoNombre: "Agrimec",
            concentracionProducto: 18,
            cantidadTotalProducto: 600
          }
        ]
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
        cantidadTotalFertilizante: 750,
        factor: 1
      }
    ],
    riego: { tipoRecomendacion: "riego_pesado" },
    labores: [{ labor: "horqueteo" }, { labor: "enzunchado" }]
  };
}

describe("VisitaRecetasService", () => {
  let recetaRepo: RepoMock;
  let visitaRepo: RepoMock;
  let plagaEnfermedadRepo: RepoMock;
  let observacionSanitariaRepo: RepoMock;
  let evaluacionRepo: RepoMock;
  let nutrienteRepo: RepoMock;
  let fitosanidadRepo: RepoMock;
  let mezclaRepo: RepoMock;
  let fertilizacionRepo: RepoMock;
  let riegoRepo: RepoMock;
  let laborRepo: RepoMock;
  let historialRepo: RepoMock;
  let service: VisitaRecetasService;

  beforeEach(() => {
    recetaRepo = makeRepo();
    visitaRepo = makeRepo();
    plagaEnfermedadRepo = makeRepo();
    observacionSanitariaRepo = makeRepo();
    evaluacionRepo = makeRepo();
    nutrienteRepo = makeRepo();
    fitosanidadRepo = makeRepo();
    fitosanidadRepo.create.mockImplementation((value) => value);
    mezclaRepo = makeRepo();
    mezclaRepo.create.mockImplementation((value) => value);
    mezclaRepo.save.mockImplementation(async (value) => ({ ...value, id: "m1" }));
    fertilizacionRepo = makeRepo();
    fertilizacionRepo.create.mockImplementation((value) => value);
    riegoRepo = makeRepo();
    laborRepo = makeRepo();
    historialRepo = makeRepo();
    service = new VisitaRecetasService(
      recetaRepo as unknown as Repository<VisitaRecetaEntity>,
      visitaRepo as unknown as Repository<VisitaCampoEntity>,
      plagaEnfermedadRepo as unknown as Repository<PlagaEnfermedadEntity>,
      observacionSanitariaRepo as unknown as Repository<VisitaObservacionSanitariaEntity>,
      evaluacionRepo as unknown as Repository<VisitaEvaluacionEntity>,
      nutrienteRepo as unknown as Repository<NutrienteEntity>,
      fitosanidadRepo as unknown as Repository<VisitaRecetaFitosanidadEntity>,
      mezclaRepo as unknown as Repository<VisitaRecetaMezclaEntity>,
      fertilizacionRepo as unknown as Repository<VisitaRecetaFertilizacionEntity>,
      riegoRepo as unknown as Repository<VisitaRecetaRiegoEntity>,
      laborRepo as unknown as Repository<VisitaRecetaLaborEntity>,
      historialRepo as unknown as Repository<VisitaRecetaHistorialEntity>
    );
  });

  describe("finalize", () => {
    it("rechaza una hora final anterior a la hora inicial", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      const dto = Object.assign(makeValidDto(), { endVisitTime: "07:59" });

      await expect(service.finalize("10", dto)).rejects.toThrow(
        "mayor o igual a la hora de inicio"
      );
      expect(recetaRepo.findOne).not.toHaveBeenCalled();
    });

    it("rechaza productos sin ninguna mezcla", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      const dto = Object.assign(makeValidDto(), {
        endVisitTime: "09:00",
        mezclas: [],
        fertilizacion: [
          { ...makeValidDto().fertilizacion[0], mezclaNumero: undefined }
        ]
      });

      await expect(service.finalize("10", dto)).rejects.toThrow(
        "Registra al menos una mezcla"
      );
    });
  });

  describe("save", () => {
    it("throws BadRequestException when visita does not exist", async () => {
      visitaRepo.findOne.mockResolvedValue(null);

      await expect(service.save("999", makeValidDto())).rejects.toThrow(
        BadRequestException
      );
    });

    it("requires catalog target and grade zero for a preventive product", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      const dto = makeValidDto();
      Object.assign(dto.mezclas![0]!.productos[0]!, {
        enfoque: "preventivo",
        objetivoId: 12,
        incidenciaGrado: 1,
        severidadGrado: 0
      });
      dto.mezclas![0]!.factor = 1;

      await expect(service.save("10", dto)).rejects.toThrow(
        "incidencia y severidad grado 0"
      );
      expect(recetaRepo.findOne).not.toHaveBeenCalled();
    });

    it("rejects prevention for an objective diagnosed positively", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      plagaEnfermedadRepo.findOne.mockResolvedValue({
        id: "12",
        name: "Thrips",
        type: "plaga",
        isActive: true
      });
      observacionSanitariaRepo.findOne.mockResolvedValue({
        incidencePercentage: null,
        nivelIncidencia: { grade: 2 }
      });
      const dto = makeValidDto();
      Object.assign(dto.mezclas![0]!.productos[0]!, {
        enfoque: "preventivo",
        objetivoId: 12,
        incidenciaGrado: 0,
        severidadGrado: 0
      });
      dto.mezclas![0]!.factor = 1;

      await expect(service.save("10", dto)).rejects.toThrow(
        "diagnosticado positivamente"
      );
      expect(recetaRepo.findOne).not.toHaveBeenCalled();
    });

    it("rejects the same objective as reactive and preventive for legacy clients", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      plagaEnfermedadRepo.findOne.mockResolvedValue({
        id: "12",
        name: "Thrips",
        type: "plaga",
        isActive: true
      });
      const dto = makeValidDto();
      dto.mezclas![0]!.productos.push({
        ...dto.mezclas![0]!.productos[0]!,
        enfoque: "preventivo",
        objetivoId: 12,
        objetivoNombre: "nombre no confiable",
        incidenciaGrado: 0,
        severidadGrado: 0
      });

      await expect(service.save("10", dto)).rejects.toThrow(
        "reactivo y preventivo"
      );
      expect(observacionSanitariaRepo.findOne).not.toHaveBeenCalled();
    });

    it("requires factor one for preventive fertilization", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      const dto = makeValidDto();
      dto.fertilizacion[0]!.enfoque = "preventivo";
      dto.fertilizacion[0]!.factor = 1.2;

      await expect(service.save("10", dto)).rejects.toThrow(
        "fertilizacion preventiva debe usar factor 1"
      );
      expect(recetaRepo.findOne).not.toHaveBeenCalled();
    });

    it("clasifica como curativo un nutriente evaluado aunque tenga grado cero", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      nutrienteRepo.findOne.mockResolvedValue({
        id: "12",
        cultivoId: "5",
        name: "Boro",
        isActive: true
      });
      evaluacionRepo.findOne.mockResolvedValue({
        visitaId: "10",
        nutrientId: "12",
        incidencePercentage: "0"
      });
      const dto = makeValidDto();
      Object.assign(dto.fertilizacion[0]!, {
        nutrienteId: "12",
        enfoque: "preventivo",
        factor: 1
      });

      await expect(service.save("10", dto)).rejects.toThrow(
        "debe recomendarse como curativo"
      );
    });

    it("clasifica como preventivo un nutriente no evaluado", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      nutrienteRepo.findOne.mockResolvedValue({
        id: "13",
        cultivoId: "5",
        name: "Zinc",
        isActive: true
      });
      evaluacionRepo.findOne.mockResolvedValue(null);
      const dto = makeValidDto();
      Object.assign(dto.fertilizacion[0]!, {
        nutrienteId: "13",
        enfoque: "reactivo"
      });

      await expect(service.save("10", dto)).rejects.toThrow(
        "debe recomendarse como preventivo"
      );
    });

    it("creates a new receta when none exists for the visita", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      plagaEnfermedadRepo.findOne.mockResolvedValue({
        id: "12",
        name: "Thrips",
        type: "plaga",
        isActive: true
      });
      observacionSanitariaRepo.findOne.mockResolvedValue(null);
      nutrienteRepo.findOne.mockResolvedValue({
        id: "13",
        cultivoId: "5",
        name: "Zinc",
        isActive: true
      });
      evaluacionRepo.findOne.mockResolvedValue(null);
      recetaRepo.findOne.mockResolvedValueOnce(null); // no existing
      recetaRepo.create.mockReturnValue(makeReceta());
      recetaRepo.save.mockResolvedValue(makeReceta());
      recetaRepo.findOne
        .mockResolvedValueOnce(null) // after create receta
        .mockResolvedValueOnce(
          makeReceta({ fitosanidad: [], fertilizacion: [], labores: [] })
        ) // after fitosanidad
        .mockResolvedValueOnce(
          makeReceta({
            id: "1",
            fitosanidad: [{ id: "f1" } as VisitaRecetaFitosanidadEntity],
            fertilizacion: [{ id: "fe1" } as VisitaRecetaFertilizacionEntity],
            riego: { id: "r1" } as VisitaRecetaRiegoEntity,
            labores: [{ id: "l1" }, { id: "l2" }] as VisitaRecetaLaborEntity[]
          })
        );
      historialRepo.create.mockReturnValue({});
      historialRepo.save.mockResolvedValue({});

      const dto = makeValidDto();
      Object.assign(dto.mezclas![0]!.productos[0]!, {
        enfoque: "preventivo",
        objetivoId: 12,
        incidenciaGrado: 0,
        severidadGrado: 0
      });
      dto.mezclas![0]!.factor = 1;
      dto.fertilizacion[0]!.enfoque = "preventivo";
      dto.fertilizacion[0]!.nutrienteId = "13";

      const result = await service.save("10", dto);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(fitosanidadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dosisProducto: 250,
          unidadDosis: "ml/cilindro",
          volumenAplicacion: 2,
          cantidadTotalProducto: 500,
          enfoque: "preventivo",
          objetivoId: "12",
          incidenciaGrado: 0,
          severidadGrado: 0
        })
      );
      expect(fertilizacionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nutrienteId: "13",
          nutrienteNombre: "Zinc",
          cantidadTotalFertilizante: 750,
          enfoque: "preventivo",
          factor: 1
        })
      );
    });

    it("rejects duplicate mixture numbers", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      recetaRepo.findOne.mockResolvedValue(null);
      recetaRepo.create.mockReturnValue(makeReceta());
      recetaRepo.save.mockResolvedValue(makeReceta());
      const dto = makeValidDto();
      dto.mezclas!.push({ ...dto.mezclas![0], productos: [] });

      await expect(service.save("10", dto)).rejects.toThrow(
        "El numero de mezcla 1 esta duplicado."
      );
    });

    it("rejects malformed serialized mixture arrays", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      recetaRepo.findOne.mockResolvedValue(null);
      recetaRepo.create.mockReturnValue(makeReceta());
      recetaRepo.save.mockResolvedValue(makeReceta());
      const dto = makeValidDto();
      dto.mezclas![0].ordenMezcla = "not-json";

      await expect(service.save("10", dto)).rejects.toThrow(
        "ordenMezcla debe contener un arreglo JSON valido."
      );
    });

    it("rejects a liquid dose unit for a solid fertilizer", async () => {
      visitaRepo.findOne.mockResolvedValue(makeVisita());
      recetaRepo.findOne.mockResolvedValue(null);
      recetaRepo.create.mockReturnValue(makeReceta());
      recetaRepo.save.mockResolvedValue(makeReceta());
      mezclaRepo.create.mockReturnValue({});
      mezclaRepo.save.mockResolvedValue({ id: "m1" });
      const dto = makeValidDto();
      dto.fertilizacion[0]!.unidadDosis = "ml/planta";

      await expect(service.save("10", dto)).rejects.toThrow(
        "La unidad de dosis no corresponde al tipo de producto y via de fertilizacion."
      );
    });
  });

  describe("findByVisitaId", () => {
    it("throws NotFoundException when visita does not exist", async () => {
      visitaRepo.findOne.mockResolvedValue(null);

      await expect(service.findByVisitaId("999")).rejects.toThrow(NotFoundException);
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
          fitosanidad: [
            {
              id: "f1",
              numero: 1,
              objetivo: "plaga",
              objetivoNombre: "Thrips"
            } as VisitaRecetaFitosanidadEntity
          ],
          fertilizacion: [
            { id: "fe1", viaAplicacion: "edafica" } as VisitaRecetaFertilizacionEntity
          ],
          riego: {
            id: "r1",
            tipoRecomendacion: "riego_pesado"
          } as VisitaRecetaRiegoEntity,
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
        {
          id: "h1",
          version: 1,
          snapshot: { etapaFenologica: "v1" },
          createdAt: new Date("2025-01-01")
        },
        {
          id: "h2",
          version: 2,
          snapshot: { etapaFenologica: "v2" },
          createdAt: new Date("2025-01-02")
        }
      ]);

      const result = await service.getHistorial("10");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].version).toBe(1);
      expect(result.data[1].version).toBe(2);
    });
  });
});
