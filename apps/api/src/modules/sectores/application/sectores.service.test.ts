import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DistritoEntity } from "../../geografias/infrastructure/persistence/entities/distrito.entity";
import type { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import type { SectorEntity } from "../infrastructure/persistence/entities/sector.entity";
import { SectoresService } from "./sectores.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  createQueryBuilder: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    createQueryBuilder: vi.fn()
  };
}

function asRepo<T>(repo: RepoMock): Repository<T> {
  return repo as unknown as Repository<T>;
}

function makeSector(overrides: Partial<SectorEntity> = {}): SectorEntity {
  return {
    id: "1",
    publicId: "s1b2c3d4-e5f6-7890-abcd-ef1234567890",
    distritoId: "100",
    name: "Sector Norte",
    description: "Zona norte del distrito",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    distrito: undefined as unknown as SectorEntity["distrito"],
    subsectores: [],
    ...overrides
  } as SectorEntity;
}

function makeDistrito(overrides: Partial<DistritoEntity> = {}): DistritoEntity {
  return {
    id: "100",
    provinciaId: "50",
    ubigeo: "150101",
    name: "Cercado de Lima",
    provincia: undefined as unknown as DistritoEntity["provincia"],
    sectores: [],
    ...overrides
  } as DistritoEntity;
}

function makeProductor(overrides: Partial<ProductorEntity> = {}): ProductorEntity {
  return {
    id: "50",
    publicId: "p1b2c3d4-e5f6-7890-abcd-ef1234567890",
    tipoDocumentoId: 1,
    documentNumber: "12345678",
    firstName: "Juan",
    lastName: "Pérez",
    phone: null,
    email: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    tipoDocumento: undefined as unknown as ProductorEntity["tipoDocumento"],
    parcelas: [],
    ...overrides
  } as ProductorEntity;
}

function makeQueryBuilder<T>(result: T[]) {
  return {
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    distinct: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue(result)
  };
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeForeignKeyViolation(constraint: string) {
  const driverError = { code: "23503", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeFindSectoresQuery(overrides: Partial<{ distrito_id: number; activo: boolean }> = {}) {
  return {
    page: 1,
    limit: 50,
    skip: 0,
    take: 50,
    ...overrides
  } as unknown as import("../presentation/dto/find-sectores-query.dto").FindSectoresQueryDto;
}

describe("SectoresService", () => {
  let sectoresRepo: RepoMock;
  let distritosRepo: RepoMock;
  let productoresRepo: RepoMock;
  let service: SectoresService;

  beforeEach(() => {
    vi.clearAllMocks();
    sectoresRepo = makeRepo();
    distritosRepo = makeRepo();
    productoresRepo = makeRepo();
    service = new SectoresService(
      asRepo<SectorEntity>(sectoresRepo),
      asRepo<DistritoEntity>(distritosRepo),
      asRepo<ProductorEntity>(productoresRepo)
    );
  });

  describe("#create", () => {
    const validDto = {
      distritoId: "100",
      name: "Sector Norte",
      description: "Zona norte",
      isActive: true
    };

    it("should validate distrito FK, check unique name, and persist the sector", async () => {
      distritosRepo.findOne.mockResolvedValueOnce(makeDistrito());
      sectoresRepo.findOne.mockResolvedValueOnce(null);
      const entity = makeSector({ id: "2", name: "Sector Norte" });
      sectoresRepo.create.mockReturnValue(entity);
      sectoresRepo.save.mockResolvedValue(entity);

      const result = await service.create(validDto);

      expect(distritosRepo.findOne).toHaveBeenCalledWith({ where: { id: "100" } });
      expect(sectoresRepo.findOne).toHaveBeenCalledWith({
        where: { distritoId: "100", name: "Sector Norte" }
      });
      expect(sectoresRepo.create).toHaveBeenCalledWith({
        distritoId: "100",
        name: "Sector Norte",
        description: "Zona norte",
        isActive: true
      });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ name: "Sector Norte", distritoId: "100" });
    });

    it("should return existing sector when publicId matches (idempotent create)", async () => {
      const existing = makeSector({ id: "888", publicId: "existing-id" });
      sectoresRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.create({
        ...validDto,
        publicId: "existing-id"
      });

      expect(result.data.id).toBe("888");
      expect(sectoresRepo.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when distrito FK does not exist", async () => {
      distritosRepo.findOne.mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when name already exists for the same distrito", async () => {
      distritosRepo.findOne.mockResolvedValueOnce(makeDistrito());
      sectoresRepo.findOne.mockResolvedValueOnce(makeSector({ id: "5" }));

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when DB unique constraint [sectores_distrito_id_nombre_key] fails", async () => {
      distritosRepo.findOne.mockResolvedValueOnce(makeDistrito());
      sectoresRepo.findOne.mockResolvedValueOnce(null);
      sectoresRepo.create.mockReturnValue(makeSector());
      sectoresRepo.save.mockRejectedValue(
        makeUniqueViolation("sectores_distrito_id_nombre_key")
      );

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [sectores_distrito_id_fkey] occurs", async () => {
      distritosRepo.findOne.mockResolvedValueOnce(makeDistrito());
      sectoresRepo.findOne.mockResolvedValueOnce(null);
      sectoresRepo.create.mockReturnValue(makeSector());
      sectoresRepo.save.mockRejectedValue(
        makeForeignKeyViolation("sectores_distrito_id_fkey")
      );

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("#findAll", () => {
    it("should return paginated sectores ordered by distritoId and name ASC", async () => {
      const sector = makeSector();
      sectoresRepo.findAndCount.mockResolvedValue([[sector], 1]);

      const result = await service.findAll(makeFindSectoresQuery());

      expect(sectoresRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { distritoId: "ASC", name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should filter by distrito_id when provided", async () => {
      sectoresRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(makeFindSectoresQuery({ distrito_id: 100 }));

      expect(sectoresRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { distritoId: 100 } })
      );
    });

    it("should filter by activo when provided", async () => {
      sectoresRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(makeFindSectoresQuery({ activo: false }));

      expect(sectoresRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: false } })
      );
    });

    it("should return empty array when no sectores match", async () => {
      sectoresRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(makeFindSectoresQuery({ distrito_id: 999 }));

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("#findById", () => {
    it("should return the sector when found", async () => {
      const sector = makeSector({ id: "42" });
      sectoresRepo.findOne.mockResolvedValue(sector);

      const result = await service.findById("42");

      expect(sectoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "42" } });
      expect(result.data.id).toBe("42");
    });

    it("should throw NotFoundException when sector does not exist", async () => {
      sectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findByProductorId", () => {
    it("should validate productor exists and use QueryBuilder to find sectores", async () => {
      productoresRepo.findOne.mockResolvedValue(makeProductor());
      const qb = makeQueryBuilder([makeSector({ id: "3" }), makeSector({ id: "4" })]);
      sectoresRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByProductorId("50");

      expect(productoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "50" } });
      expect(sectoresRepo.createQueryBuilder).toHaveBeenCalledWith("sector");
      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        "parcela.productor_id = :productorId",
        { productorId: "50" }
      );
      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(qb.orderBy).toHaveBeenCalledWith("sector.name", "ASC");
      expect(qb.getMany).toHaveBeenCalled();

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ count: 2 });
    });

    it("should throw NotFoundException when productor does not exist", async () => {
      productoresRepo.findOne.mockResolvedValue(null);

      await expect(service.findByProductorId("999")).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when productor exists but has no sectores", async () => {
      productoresRepo.findOne.mockResolvedValue(makeProductor());
      const qb = makeQueryBuilder([]);
      sectoresRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByProductorId("50");

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#update", () => {
    it("should merge partial updates, validate FK and unique name, then save", async () => {
      const existing = makeSector({ id: "4", name: "Old", distritoId: "100" });
      const merged = makeSector({ id: "4", name: "New", distritoId: "100" });
      sectoresRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      sectoresRepo.merge.mockReturnValue(merged);
      sectoresRepo.save.mockResolvedValue(merged);

      const result = await service.update("4", { name: "New" });

      expect(sectoresRepo.findOne).toHaveBeenCalledTimes(2);
      expect(sectoresRepo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ name: "New" }));
      expect(result.data.name).toBe("New");
    });

    it("should validate new distrito FK when distritoId is changed", async () => {
      const existing = makeSector({ id: "4", distritoId: "100", name: "Test" });
      sectoresRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      distritosRepo.findOne.mockResolvedValue(makeDistrito({ id: "200" }));
      const merged = makeSector({ id: "4", distritoId: "200", name: "Test" });
      sectoresRepo.merge.mockReturnValue(merged);
      sectoresRepo.save.mockResolvedValue(merged);

      await service.update("4", { distritoId: "200" });

      expect(distritosRepo.findOne).toHaveBeenCalledWith({ where: { id: "200" } });
    });

    it("should throw ConflictException when updated name collides with another sector in same distrito", async () => {
      const existing = makeSector({ id: "4", name: "Old", distritoId: "100" });
      const conflict = makeSector({ id: "99", name: "Conflicting", distritoId: "100" });
      sectoresRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(conflict);

      await expect(
        service.update("4", { name: "Conflicting" })
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when sector does not exist", async () => {
      sectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.update("999", { name: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("#remove", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const sector = makeSector({ id: "5", isActive: true });
      sectoresRepo.findOne.mockResolvedValue(sector);
      sectoresRepo.save.mockImplementation(async (e) => e);

      const result = await service.remove("5");

      expect(sectoresRepo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive", async () => {
      const sector = makeSector({ id: "6", isActive: false });
      sectoresRepo.findOne.mockResolvedValue(sector);

      const result = await service.remove("6");

      expect(sectoresRepo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when sector does not exist", async () => {
      sectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findEntitiesByProductorId", () => {
    it("should return raw entities using QueryBuilder join", async () => {
      const qb = makeQueryBuilder([makeSector({ id: "1" })]);
      sectoresRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findEntitiesByProductorId("50");

      expect(sectoresRepo.createQueryBuilder).toHaveBeenCalledWith("sector");
      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        "parcela.productor_id = :productorId",
        { productorId: "50" }
      );
      expect(result).toHaveLength(1);
    });
  });
});
