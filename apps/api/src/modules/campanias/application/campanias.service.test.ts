import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaniaEntity } from "../infrastructure/persistence/entities/campania.entity";
import type { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { CampaniasService } from "./campanias.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn()
  };
}

function asRepo<T>(repo: RepoMock): Repository<T> {
  return repo as unknown as Repository<T>;
}

function makePagination(overrides: Partial<{ page: number; limit: number }> = {}) {
  const page = overrides.page ?? 1;
  const limit = overrides.limit ?? 50;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit
  } as unknown as import("../../../common/dto/pagination-query.dto").PaginationQueryDto;
}

function makeCampania(overrides: Partial<CampaniaEntity> = {}): CampaniaEntity {
  return {
    id: "1",
    publicId: "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "Campaña 2026",
    cultivoId: "10",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    description: "Campaña principal",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    cultivo: undefined as unknown as CampaniaEntity["cultivo"],
    visitasCampo: [],
    ...overrides
  } as CampaniaEntity;
}

function makeCultivo(overrides: Partial<CultivoEntity> = {}): CultivoEntity {
  return {
    id: "10",
    code: "CULT-001",
    name: "Banano",
    isActive: true,
    ...overrides
  } as CultivoEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeForeignKeyViolation(constraint: string) {
  const driverError = { code: "23503", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeFindCampaniasQuery(overrides: Partial<{ cultivo_id: number; activa: boolean }> = {}) {
  return overrides as unknown as import("../presentation/dto/find-campanias-query.dto").FindCampaniasQueryDto;
}

describe("CampaniasService", () => {
  let campaniasRepo: RepoMock;
  let cultivosRepo: RepoMock;
  let service: CampaniasService;

  beforeEach(() => {
    vi.clearAllMocks();
    campaniasRepo = makeRepo();
    cultivosRepo = makeRepo();
    service = new CampaniasService(
      asRepo<CampaniaEntity>(campaniasRepo),
      asRepo<CultivoEntity>(cultivosRepo)
    );
  });

  describe("#create", () => {
    const validDto = {
      name: "Campaña 2026",
      cultivoId: "10",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      description: "Campaña principal",
      isActive: true
    };

    it("should persist a campaign after validating FK and return a success envelope", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      const entity = makeCampania({ id: "2" });
      campaniasRepo.create.mockReturnValue(entity);
      campaniasRepo.save.mockResolvedValue(entity);

      const result = await service.create(validDto);

      expect(cultivosRepo.findOne).toHaveBeenCalledWith({ where: { id: "10" } });
      expect(campaniasRepo.create).toHaveBeenCalledWith({
        name: "Campaña 2026",
        cultivoId: "10",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        description: "Campaña principal",
        isActive: true
      });
      expect(campaniasRepo.save).toHaveBeenCalledWith(entity);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: "2",
        name: "Campaña 2026",
        cultivoId: "10"
      });
    });

    it("should default isActive to true and optional fields to null when not provided", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      campaniasRepo.create.mockReturnValue(makeCampania());
      campaniasRepo.save.mockResolvedValue(makeCampania());

      await service.create({
        name: "Test",
        cultivoId: "10",
        startDate: "2026-06-01"
      });

      expect(campaniasRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          endDate: null,
          description: null
        })
      );
    });

    it("should throw BadRequestException when cultivo FK does not exist", async () => {
      cultivosRepo.findOne.mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
      expect(cultivosRepo.findOne).toHaveBeenCalledTimes(1);
      expect(campaniasRepo.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictException when unique constraint [campanias_nombre_key] fails on save", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      campaniasRepo.create.mockReturnValue(makeCampania());
      campaniasRepo.save.mockRejectedValue(makeUniqueViolation("campanias_nombre_key"));

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [campanias_cultivo_id_fkey] occurs on save", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      campaniasRepo.create.mockReturnValue(makeCampania());
      campaniasRepo.save.mockRejectedValue(
        makeForeignKeyViolation("campanias_cultivo_id_fkey")
      );

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it("should re-throw unexpected errors untouched", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      campaniasRepo.create.mockReturnValue(makeCampania());
      campaniasRepo.save.mockRejectedValue(new Error("disk full"));

      await expect(service.create(validDto)).rejects.toThrow("disk full");
    });
  });

  describe("#findAll", () => {
    it("should return paginated results ordered by startDate DESC and name ASC with no filters", async () => {
      const campania = makeCampania();
      campaniasRepo.findAndCount.mockResolvedValue([[campania], 1]);

      const result = await service.findAll(makeFindCampaniasQuery(), makePagination());

      expect(campaniasRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { startDate: "DESC", name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });

    it("should filter by cultivo_id when provided", async () => {
      campaniasRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        makeFindCampaniasQuery({ cultivo_id: 10 }),
        makePagination()
      );

      expect(campaniasRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { cultivoId: 10 } })
      );
    });

    it("should filter by activa when provided", async () => {
      campaniasRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        makeFindCampaniasQuery({ activa: true }),
        makePagination()
      );

      expect(campaniasRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } })
      );
    });

    it("should combine both filters when cultivo_id and activa are provided", async () => {
      campaniasRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        makeFindCampaniasQuery({ cultivo_id: 10, activa: true }),
        makePagination()
      );

      expect(campaniasRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cultivoId: 10, isActive: true }
        })
      );
    });

    it("should return an empty array with zero meta when no campaigns match", async () => {
      campaniasRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(
        makeFindCampaniasQuery({ cultivo_id: 999 }),
        makePagination()
      );

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it("should include all response fields including dates and timestamps", async () => {
      const campania = makeCampania({
        id: "5",
        name: "Campaña Verano",
        startDate: "2026-06-01",
        endDate: "2026-08-31",
        createdAt: new Date("2026-05-01"),
        updatedAt: new Date("2026-05-15")
      });
      campaniasRepo.findAndCount.mockResolvedValue([[campania], 1]);

      const result = await service.findAll(makeFindCampaniasQuery(), makePagination());

      const item = result.data[0];
      expect(item.name).toBe("Campaña Verano");
      expect(item.startDate).toBe("2026-06-01");
      expect(item.endDate).toBe("2026-08-31");
      expect(item.description).toBe("Campaña principal");
      expect(item.isActive).toBe(true);
    });
  });

  describe("#findById", () => {
    it("should return the campaign when it exists", async () => {
      const campania = makeCampania({ id: "42" });
      campaniasRepo.findOne.mockResolvedValue(campania);

      const result = await service.findById("42");

      expect(campaniasRepo.findOne).toHaveBeenCalledWith({ where: { id: "42" } });
      expect(result.success).toBe(true);
      expect(result.data.id).toBe("42");
    });

    it("should throw NotFoundException when the campaign does not exist", async () => {
      campaniasRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#update", () => {
    it("should merge partial updates and return the updated campaign", async () => {
      const existing = makeCampania({ id: "3", name: "Old" });
      const merged = makeCampania({ id: "3", name: "New Name" });
      campaniasRepo.findOne.mockResolvedValue(existing);
      campaniasRepo.merge.mockReturnValue(merged);
      campaniasRepo.save.mockResolvedValue(merged);

      const result = await service.update("3", { name: "New Name" });

      expect(campaniasRepo.findOne).toHaveBeenCalledWith({ where: { id: "3" } });
      expect(campaniasRepo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ name: "New Name" }));
      expect(result.data.name).toBe("New Name");
    });

    it("should validate cultivo FK when cultivoId is changed", async () => {
      const existing = makeCampania({ id: "3", cultivoId: "10" });
      campaniasRepo.findOne.mockResolvedValue(existing);
      cultivosRepo.findOne.mockResolvedValue(makeCultivo({ id: "20" }));
      campaniasRepo.merge.mockReturnValue(makeCampania({ id: "3", cultivoId: "20" }));
      campaniasRepo.save.mockResolvedValue(makeCampania({ id: "3", cultivoId: "20" }));

      await service.update("3", { cultivoId: "20" });

      expect(cultivosRepo.findOne).toHaveBeenCalledWith({ where: { id: "20" } });
    });

    it("should throw BadRequestException when updated cultivo FK does not exist", async () => {
      const existing = makeCampania({ id: "3" });
      campaniasRepo.findOne.mockResolvedValue(existing);
      cultivosRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("3", { cultivoId: "999" })
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when updating a missing campaign", async () => {
      campaniasRepo.findOne.mockResolvedValue(null);

      await expect(service.update("999", { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when unique constraint [campanias_nombre_key] fails on update", async () => {
      const existing = makeCampania();
      campaniasRepo.findOne.mockResolvedValue(existing);
      campaniasRepo.merge.mockReturnValue(existing);
      campaniasRepo.save.mockRejectedValue(makeUniqueViolation("campanias_nombre_key"));

      await expect(
        service.update("1", { name: "DUP" })
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [campanias_cultivo_id_fkey] occurs on update save", async () => {
      const existing = makeCampania();
      campaniasRepo.findOne.mockResolvedValue(existing);
      campaniasRepo.merge.mockReturnValue(existing);
      campaniasRepo.save.mockRejectedValue(
        makeForeignKeyViolation("campanias_cultivo_id_fkey")
      );

      await expect(
        service.update("1", { cultivoId: "10" })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("#remove", () => {
    it("should soft-delete the campaign by setting isActive to false", async () => {
      const campania = makeCampania({ id: "4", isActive: true });
      campaniasRepo.findOne.mockResolvedValue(campania);
      campaniasRepo.save.mockImplementation(async (entity) => entity);

      const result = await service.remove("4");

      expect(campaniasRepo.findOne).toHaveBeenCalledWith({ where: { id: "4" } });
      expect(campaniasRepo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return the campaign unchanged when it is already inactive", async () => {
      const campania = makeCampania({ id: "5", isActive: false });
      campaniasRepo.findOne.mockResolvedValue(campania);

      const result = await service.remove("5");

      expect(campaniasRepo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when deleting a missing campaign", async () => {
      campaniasRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });
});
