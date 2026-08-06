import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { ObjectLiteral, Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import type { SectorEntity } from "../../sectores/infrastructure/persistence/entities/sector.entity";
import type { SubsectorEntity } from "../infrastructure/persistence/entities/subsector.entity";
import { SubsectoresService } from "./subsectores.service";

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

function asRepo<T extends ObjectLiteral>(repo: RepoMock): Repository<T> {
  return repo as unknown as Repository<T>;
}

function makeSubsector(overrides: Partial<SubsectorEntity> = {}): SubsectorEntity {
  return {
    id: "1",
    publicId: "s1b2c3d4-e5f6-7890-abcd-ef1234567890",
    sectorId: "10",
    name: "Subsector A",
    description: "Descripción del subsector",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    sector: undefined as unknown as SubsectorEntity["sector"],
    parcelas: [],
    ...overrides
  } as SubsectorEntity;
}

function makeSector(overrides: Partial<SectorEntity> = {}): SectorEntity {
  return {
    id: "10",
    publicId: "p1b2c3d4-e5f6-7890-abcd-ef1234567890",
    distritoId: "100",
    name: "Sector Norte",
    description: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    distrito: undefined as unknown as SectorEntity["distrito"],
    subsectores: [],
    ...overrides
  } as SectorEntity;
}

function makeProductor(overrides: Partial<ProductorEntity> = {}): ProductorEntity {
  return {
    id: "50",
    publicId: "r1b2c3d4-e5f6-7890-abcd-ef1234567890",
    tipoDocumentoId: 1,
    documentNumber: "12345678",
    firstName: "Juan",
    lastName: "Pérez",
    phone: null,
    email: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    documentTypeId: undefined as unknown as ProductorEntity["documentTypeId"],
    parcelas: [],
    ...overrides
  } as ProductorEntity;
}

function makeQueryBuilder<T>(result: T[]) {
  return {
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
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

function makeFindSubsectoresQuery(overrides: Partial<{ sector_id: number; activo: boolean }> = {}) {
  return {
    page: 1,
    limit: 50,
    skip: 0,
    take: 50,
    ...overrides
  } as unknown as import("../presentation/dto/find-subsectores-query.dto").FindSubsectoresQueryDto;
}

describe("SubsectoresService", () => {
  let subsectoresRepo: RepoMock;
  let sectoresRepo: RepoMock;
  let productoresRepo: RepoMock;
  let service: SubsectoresService;

  beforeEach(() => {
    vi.clearAllMocks();
    subsectoresRepo = makeRepo();
    sectoresRepo = makeRepo();
    productoresRepo = makeRepo();
    service = new SubsectoresService(
      asRepo<SubsectorEntity>(subsectoresRepo),
      asRepo<SectorEntity>(sectoresRepo),
      asRepo<ProductorEntity>(productoresRepo)
    );
  });

  describe("#create", () => {
    const validDto = {
      sectorId: "10",
      name: "Subsector Norte A",
      description: "Zona norte del sector",
      isActive: true
    };

    it("should validate sector FK, check unique name, and persist the subsector", async () => {
      sectoresRepo.findOne.mockResolvedValueOnce(makeSector());
      subsectoresRepo.findOne.mockResolvedValueOnce(null);
      const entity = makeSubsector({ id: "2", name: "Subsector Norte A" });
      subsectoresRepo.create.mockReturnValue(entity);
      subsectoresRepo.save.mockResolvedValue(entity);

      const result = await service.create(validDto);

      expect(sectoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "10" } });
      expect(subsectoresRepo.findOne).toHaveBeenCalledWith({
        where: { sectorId: "10", name: "Subsector Norte A" }
      });
      expect(subsectoresRepo.create).toHaveBeenCalledWith({
        sectorId: "10",
        name: "Subsector Norte A",
        description: "Zona norte del sector",
        isActive: true
      });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ name: "Subsector Norte A", sectorId: "10" });
    });

    it("should return existing subsector when publicId matches (idempotent create)", async () => {
      const existing = makeSubsector({ id: "999", publicId: "existing-pub-id" });
      subsectoresRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.create({
        ...validDto,
        publicId: "existing-pub-id"
      });

      expect(result.data.id).toBe("999");
      expect(result.success).toBe(true);
      expect(subsectoresRepo.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when sector FK does not exist", async () => {
      sectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when name already exists for the same sector", async () => {
      sectoresRepo.findOne.mockResolvedValueOnce(makeSector());
      subsectoresRepo.findOne.mockResolvedValueOnce(makeSubsector({ id: "5" }));

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when DB unique constraint [uq_subsectores_sector_nombre] fails", async () => {
      sectoresRepo.findOne.mockResolvedValueOnce(makeSector());
      subsectoresRepo.findOne.mockResolvedValueOnce(null);
      subsectoresRepo.create.mockReturnValue(makeSubsector());
      subsectoresRepo.save.mockRejectedValue(
        makeUniqueViolation("uq_subsectores_sector_nombre")
      );

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [subsectores_sector_id_fkey] occurs", async () => {
      sectoresRepo.findOne.mockResolvedValueOnce(makeSector());
      subsectoresRepo.findOne.mockResolvedValueOnce(null);
      subsectoresRepo.create.mockReturnValue(makeSubsector());
      subsectoresRepo.save.mockRejectedValue(
        makeForeignKeyViolation("subsectores_sector_id_fkey")
      );

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("#findAll", () => {
    it("should return paginated subsectores ordered by sectorId and name ASC", async () => {
      const subsector = makeSubsector();
      subsectoresRepo.findAndCount.mockResolvedValue([[subsector], 1]);

      const result = await service.findAll(makeFindSubsectoresQuery());

      expect(subsectoresRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { sectorId: "ASC", name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta!.total).toBe(1);
    });

    it("should filter by sector_id when provided", async () => {
      subsectoresRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(makeFindSubsectoresQuery({ sector_id: 10 }));

      expect(subsectoresRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sectorId: 10 } })
      );
    });

    it("should filter by activo when provided", async () => {
      subsectoresRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(makeFindSubsectoresQuery({ activo: true }));

      expect(subsectoresRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } })
      );
    });

    it("should return empty array when no subsectores match", async () => {
      subsectoresRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(makeFindSubsectoresQuery({ sector_id: 999 }));

      expect(result.data).toEqual([]);
      expect(result.meta!.total).toBe(0);
    });
  });

  describe("#findById", () => {
    it("should return the subsector when found", async () => {
      const subsector = makeSubsector({ id: "42" });
      subsectoresRepo.findOne.mockResolvedValue(subsector);

      const result = await service.findById("42");

      expect(subsectoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "42" } });
      expect(result.data.id).toBe("42");
    });

    it("should throw NotFoundException when subsector does not exist", async () => {
      subsectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findBySectorId", () => {
    it("should validate sector exists and return subsectores with count", async () => {
      sectoresRepo.findOne.mockResolvedValue(makeSector());
      subsectoresRepo.find.mockResolvedValue([makeSubsector({ id: "1" }), makeSubsector({ id: "2" })]);

      const result = await service.findBySectorId("10");

      expect(sectoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "10" } });
      expect(subsectoresRepo.find).toHaveBeenCalledWith({
        where: { sectorId: "10" },
        order: { name: "ASC" }
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ count: 2 });
    });

    it("should throw NotFoundException when sector does not exist", async () => {
      sectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.findBySectorId("999")).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when sector exists but has no subsectores", async () => {
      sectoresRepo.findOne.mockResolvedValue(makeSector());
      subsectoresRepo.find.mockResolvedValue([]);

      const result = await service.findBySectorId("10");

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#findByProductorAndSector", () => {
    it("should validate both productor and sector exist, then use QueryBuilder to find subsectores", async () => {
      productoresRepo.findOne.mockResolvedValue(makeProductor());
      sectoresRepo.findOne.mockResolvedValue(makeSector());
      const qb = makeQueryBuilder([makeSubsector({ id: "3" })]);
      subsectoresRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByProductorAndSector("50", "10");

      expect(productoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "50" } });
      expect(sectoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "10" } });

      expect(subsectoresRepo.createQueryBuilder).toHaveBeenCalledWith("subsector");
      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        "parcela.productor_id = :productorId",
        { productorId: "50" }
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        "subsector.sector_id = :sectorId",
        { sectorId: "10" }
      );
      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(qb.orderBy).toHaveBeenCalledWith("subsector.name", "ASC");
      expect(qb.getMany).toHaveBeenCalled();

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ count: 1 });
    });

    it("should throw NotFoundException when productor does not exist", async () => {
      productoresRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findByProductorAndSector("999", "10")
      ).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when productor and sector exist but no subsectores match", async () => {
      productoresRepo.findOne.mockResolvedValue(makeProductor());
      sectoresRepo.findOne.mockResolvedValue(makeSector());
      const qb = makeQueryBuilder([]);
      subsectoresRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByProductorAndSector("50", "10");

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#update", () => {
    it("should merge partial updates, validate FK and unique name, then save", async () => {
      const existing = makeSubsector({ id: "4", name: "Old", sectorId: "10" });
      const merged = makeSubsector({ id: "4", name: "New Name", sectorId: "10" });
      subsectoresRepo.findOne.mockResolvedValueOnce(existing);
      subsectoresRepo.findOne.mockResolvedValueOnce(null);
      subsectoresRepo.merge.mockReturnValue(merged);
      subsectoresRepo.save.mockResolvedValue(merged);

      const result = await service.update("4", { name: "New Name" });

      expect(subsectoresRepo.findOne).toHaveBeenCalledTimes(2);
      expect(subsectoresRepo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ name: "New Name" }));
      expect(result.data.name).toBe("New Name");
    });

    it("should validate new sector FK when sectorId is changed", async () => {
      const existing = makeSubsector({ id: "4", sectorId: "10", name: "Test" });
      subsectoresRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      sectoresRepo.findOne.mockResolvedValue(makeSector({ id: "20" }));
      const merged = makeSubsector({ id: "4", sectorId: "20", name: "Test" });
      subsectoresRepo.merge.mockReturnValue(merged);
      subsectoresRepo.save.mockResolvedValue(merged);

      await service.update("4", { sectorId: "20" });

      expect(sectoresRepo.findOne).toHaveBeenCalledWith({ where: { id: "20" } });
    });

    it("should throw ConflictException when updated name collides with another subsector in same sector", async () => {
      const existing = makeSubsector({ id: "4", name: "Old", sectorId: "10" });
      const conflict = makeSubsector({ id: "99", name: "Conflicting", sectorId: "10" });
      subsectoresRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(conflict);

      await expect(
        service.update("4", { name: "Conflicting" })
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when subsector does not exist", async () => {
      subsectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.update("999", { name: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("#remove", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const subsector = makeSubsector({ id: "5", isActive: true });
      subsectoresRepo.findOne.mockResolvedValue(subsector);
      subsectoresRepo.save.mockImplementation(async (e) => e);

      const result = await service.remove("5");

      expect(subsectoresRepo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive", async () => {
      const subsector = makeSubsector({ id: "6", isActive: false });
      subsectoresRepo.findOne.mockResolvedValue(subsector);

      const result = await service.remove("6");

      expect(subsectoresRepo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when subsector does not exist", async () => {
      subsectoresRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findEntitiesBySectorId", () => {
    it("should return raw entities ordered by name ASC", async () => {
      subsectoresRepo.find.mockResolvedValue([makeSubsector({ id: "1" }), makeSubsector({ id: "2" })]);

      const result = await service.findEntitiesBySectorId("10");

      expect(subsectoresRepo.find).toHaveBeenCalledWith({
        where: { sectorId: "10" },
        order: { name: "ASC" }
      });
      expect(result).toHaveLength(2);
    });
  });
});
