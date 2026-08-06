import { NotFoundException } from "@nestjs/common";
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
      repo as never, repo as never, repo as never, repo as never,
      repo as never, repo as never, repo as never, repo as never,
      repo as never, repo as never, repo as never, repo as never,
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

  describe("#remove", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const visita = makeVisita({ id: "5", isActive: true });
      repo.findOne.mockResolvedValue(visita);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.remove("5");

      expect(repo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive", async () => {
      const visita = makeVisita({ id: "6", isActive: false });
      repo.findOne.mockResolvedValue(visita);

      const result = await service.remove("6");

      expect(repo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });
});
