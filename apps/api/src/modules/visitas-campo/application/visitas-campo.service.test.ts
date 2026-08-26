import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import ExcelJS from "exceljs";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";
import { VisitasCampoService } from "./visitas-campo.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  createQueryBuilder: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    createQueryBuilder: vi.fn()
  };
}

function makeQueryBuilder<T>(result: T[], count: number) {
  return {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    innerJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    addGroupBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue([result, count]),
    getMany: vi.fn().mockResolvedValue(result),
    getOne: vi.fn().mockResolvedValue(result[0] ?? null)
  };
}

function makeUQ(constraint: string) {
  return new QueryFailedError("insert", [], {
    code: "23505",
    constraint
  } as unknown as Error);
}

function makeVisita(overrides: Partial<VisitaCampoEntity> = {}): VisitaCampoEntity {
  return {
    id: "1",
    publicId: "pub-v1",
    nroFicha: "F-001",
    cultivoId: "10",
    variedadId: "20",
    parcelaId: "30",
    campaniaId: "40",
    agronomoUsuarioId: "u1",
    nroPlantas: 100,
    areaHectares: "2.5",
    fechaSiembra: "2025-09-01",
    fechaVisita: "2026-06-15",
    horaVisitaInicio: "08:00",
    horaVisitaFin: "10:30",
    etapaFenologicaId: "50",
    subEtapaId: null,
    subEtapaPercentage: null,
    observacionGeneral: null,
    firmaAgronomoNombre: null,
    firmaProductorNombre: null,
    ubicacionVisita: null,
    sincronizadoAt: null,
    isActive: true,
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-15"),
    cultivo: undefined as unknown as VisitaCampoEntity["cultivo"],
    variedad: undefined as unknown as VisitaCampoEntity["variedad"],
    parcela: undefined as unknown as VisitaCampoEntity["parcela"],
    campania: undefined as unknown as VisitaCampoEntity["campania"],
    agronomoUsuario: undefined as unknown as VisitaCampoEntity["agronomoUsuario"],
    etapaFenologica: undefined as unknown as VisitaCampoEntity["etapaFenologica"],
    subEtapa: undefined as unknown as VisitaCampoEntity["subEtapa"],
    evaluaciones: [],
    observacionesSanitarias: [],
    riego: undefined as unknown as VisitaCampoEntity["riego"],
    labores: [],
    calificaciones: [],
    ...overrides
  } as VisitaCampoEntity;
}

function makeFindQuery(overrides: Record<string, unknown> = {}) {
  return {
    page: 1,
    limit: 50,
    skip: 0,
    take: 50,
    ...overrides
  } as unknown as import("../presentation/dto/find-visitas-campo-query.dto").FindVisitasCampoQueryDto;
}

describe("VisitasCampoService", () => {
  let repo: RepoMock;
  let service: VisitasCampoService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new VisitasCampoService(
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never
    );
  });

  describe("#findAll", () => {
    it("should return paginated visitas via QueryBuilder", async () => {
      const qb = makeQueryBuilder([makeVisita()], 1);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(makeFindQuery());

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("visita");
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });

    it("should return empty array when no visitas", async () => {
      const qb = makeQueryBuilder([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(makeFindQuery());

      expect(result.data).toEqual([]);
      expect(result.meta?.totalPages).toBe(0);
    });
  });

  describe("#findById", () => {
    it("should return visita when found", async () => {
      repo.findOne.mockResolvedValue(makeVisita({ id: "42" }));

      const result = await service.findById("42");

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "42" }
      });
      expect(result.data.id).toBe("42");
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#getFullDetail", () => {
    it("should include every recorded irrigation context field", async () => {
      repo.findOne
        .mockResolvedValueOnce(makeVisita())
        .mockResolvedValueOnce({
          id: "riego-1",
          visitaId: "1",
          tipoRiegoId: "tipo-1",
          fuenteAgua: "subterranea",
          tipoSuelo: "franco",
          humedadSuelo: "optimo",
          estresHidrico: false
        })
        .mockResolvedValueOnce({ id: "50", name: "Floracion" });
      repo.find.mockResolvedValue([]);

      const result = await service.getFullDetail("1");

      expect(result.data.riego).toEqual({
        id: "riego-1",
        visitaId: "1",
        tipoRiegoId: "tipo-1",
        fuenteAgua: "subterranea",
        tipoSuelo: "franco",
        humedadSuelo: "optimo",
        estresHidrico: false
      });
    });
  });

  describe("#exportExcelReport", () => {
    it("should generate an operational workbook for the requested date range", async () => {
      repo.find.mockResolvedValue([
        {
          ...makeVisita(),
          nroFicha: "F-100",
          fechaVisita: "2026-08-15",
          horaVisitaInicio: "08:00",
          horaVisitaFin: "09:30",
          agronomoUsuario: { firstName: "Ana", lastName: "Lopez" },
          campania: { name: "Mango 2026" },
          etapaFenologica: { type: "Etapa", name: "Floracion" },
          parcela: {
            code: "PAR-100",
            name: "Predio Norte",
            productor: { firstName: "Rosa", lastName: "Diaz", documentNumber: null },
            subsector: { sector: { name: "Sector Norte" } }
          }
        }
      ]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01",
        fecha_hasta: "2026-08-31",
        agronomo_usuario_id: "7"
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            agronomoUsuarioId: "7"
          })
        })
      );
      expect(report.fileName).toBe("reporte-visitas_2026-08-01_2026-08-31.xlsx");
      expect(report.content.subarray(0, 2)).toEqual(Buffer.from("PK"));

      const workbook = new ExcelJS.Workbook();
      const xlsxContent = report.content as unknown as Parameters<typeof workbook.xlsx.load>[0];
      await workbook.xlsx.load(xlsxContent);
      const worksheet = workbook.getWorksheet("Visitas");

      expect(worksheet).toBeDefined();
      const headerValues = [
        "Fecha",
        "N.° ficha",
        "Agrónomo",
        "Productor",
        "Sector",
        "Parcela",
        "Campaña",
        "Etapa/Labor",
        "Hora inicio",
        "Hora fin",
        "Estado"
      ];

      for (const [index, value] of headerValues.entries()) {
        expect(worksheet!.getRow(4).getCell(index + 1).value).toBe(value);
      }

      expect(worksheet!.getRow(5).getCell(3).value).toBe("Ana Lopez");
    });

    it("should reject an inverted date range before querying visits", async () => {
      await expect(
        service.exportExcelReport({
          fecha_desde: "2026-08-31",
          fecha_hasta: "2026-08-01"
        })
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.find).not.toHaveBeenCalled();
    });

    it("should constrain an agronomist to their own visits", async () => {
      repo.find.mockResolvedValue([]);

      await service.exportExcelReport(
        {
          fecha_desde: "2026-01-01",
          fecha_hasta: "2026-01-31",
          agronomo_usuario_id: "another-agronomist"
        },
        { userId: "current-agronomist", roles: ["AGRONOMO"] }
      );

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agronomoUsuarioId: "current-agronomist" })
        })
      );
    });
  });

  describe("#remove", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const visita = makeVisita({ id: "5", isActive: true });
      repo.findOne.mockResolvedValue(visita);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.remove("5", {
        userId: "admin-1",
        roles: ["ADMIN"]
      });

      expect(repo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive", async () => {
      const visita = makeVisita({ id: "6", isActive: false });
      repo.findOne.mockResolvedValue(visita);

      const result = await service.remove("6", {
        userId: "admin-1",
        roles: ["ADMIN"]
      });

      expect(repo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove("999", { userId: "admin-1", roles: ["ADMIN"] })
      ).rejects.toThrow(NotFoundException);
    });

    it("allows an authorized agronomist to delete their own visit", async () => {
      const visita = makeVisita({ id: "7", agronomoUsuarioId: "agro-1" });
      repo.findOne
        .mockResolvedValueOnce(visita)
        .mockResolvedValueOnce({ id: "agro-1", canDeleteVisits: true });
      repo.save.mockImplementation(async (entity) => entity);

      const result = await service.remove("7", {
        userId: "agro-1",
        roles: ["AGRONOMO"]
      });

      expect(result.data.isActive).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(visita);
    });

    it("rejects an agronomist without the individual permission", async () => {
      repo.findOne
        .mockResolvedValueOnce(makeVisita({ agronomoUsuarioId: "agro-1" }))
        .mockResolvedValueOnce({ id: "agro-1", canDeleteVisits: false });

      await expect(
        service.remove("1", { userId: "agro-1", roles: ["AGRONOMO"] })
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it("hides visits owned by another agronomist", async () => {
      repo.findOne.mockResolvedValue(makeVisita({ agronomoUsuarioId: "agro-owner" }));

      await expect(
        service.remove("1", { userId: "agro-other", roles: ["AGRONOMO"] })
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("#create", () => {
    const validDto = {
      cropId: "10",
      varietyId: "20",
      parcelaId: "30",
      campaignId: "40",
      agronomistUserId: "u1",
      visitDate: "2026-06-15",
      startVisitTime: "08:00",
      phenologicalStageId: "50"
    };

    it("should reject when parcela not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.create(validDto)).rejects.toThrow();
    });

    it("rejects a visit when the parcela is inactive", async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: "10" })
        .mockResolvedValueOnce({ id: "20", cultivoId: "10" })
        .mockResolvedValueOnce({ id: "30", isActive: false });

      await expect(service.create(validDto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("hides a parcela assigned to another agronomist", async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: "10" })
        .mockResolvedValueOnce({ id: "20", cultivoId: "10" })
        .mockResolvedValueOnce({
          id: "30",
          isActive: true,
          agronomoUsuarioId: "otro-agronomo"
        });

      await expect(
        service.create(validDto, {
          userId: "u1",
          roles: ["AGRONOMO"]
        })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should handle duplicate nroFicha via ConflictException", async () => {
      repo.findOne.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce({ id: "10" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "20" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "30" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "40" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "u1" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "50", type: "Etapa" } as never);
      repo.findOne.mockResolvedValueOnce(null);
      repo.create.mockReturnValue(makeVisita());
      repo.save.mockRejectedValue(makeUQ("visitas_campo_nro_ficha_key"));
      await expect(service.create({ ...validDto, nroFicha: "F-001" })).rejects.toThrow();
    });
  });
});
