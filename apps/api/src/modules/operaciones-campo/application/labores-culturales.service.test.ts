import { ConflictException, NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LaborCulturalEntity } from "../infrastructure/persistence/entities/labor-cultural.entity";
import { LaboresCulturalesService } from "./labores-culturales.service";

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

function asRepo(repo: RepoMock): Repository<LaborCulturalEntity> {
  return repo as unknown as Repository<LaborCulturalEntity>;
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

function makeLaborCultural(overrides: Partial<LaborCulturalEntity> = {}): LaborCulturalEntity {
  return {
    id: "1",
    name: "Riego",
    description: "Labor de riego",
    categoryCode: "RIEGO",
    categoryName: "Riego",
    optionCode: null,
    optionLabel: null,
    legend: null,
    sortOrder: 1,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides
  } as LaborCulturalEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

describe("LaboresCulturalesService", () => {
  let repo: RepoMock;
  let service: LaboresCulturalesService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new LaboresCulturalesService(asRepo(repo));
  });

  describe("#create", () => {
    it("should persist a new labor cultural with all optional fields defaulted to null", async () => {
      const dto = { name: "Riego por goteo", categoryCode: "RIEGO" };
      const entity = makeLaborCultural({ id: "2", name: "Riego por goteo" });
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Riego por goteo",
          description: null,
          categoryCode: "RIEGO",
          categoryName: null,
          isActive: true
        })
      );
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Riego por goteo");
    });

    it("should throw ConflictException when unique constraint [labores_culturales_nombre_key] fails", async () => {
      repo.create.mockReturnValue(makeLaborCultural());
      repo.save.mockRejectedValue(makeUniqueViolation("labores_culturales_nombre_key"));

      await expect(
        service.create({ name: "DUP" })
      ).rejects.toThrow(ConflictException);
    });

    it("should re-throw unexpected errors untouched", async () => {
      repo.create.mockReturnValue(makeLaborCultural());
      repo.save.mockRejectedValue(new Error("disk full"));

      await expect(service.create({ name: "X" })).rejects.toThrow("disk full");
    });
  });

  describe("#findAll", () => {
    it("should return paginated results ordered by name ASC", async () => {
      repo.findAndCount.mockResolvedValue([[makeLaborCultural()], 1]);

      const result = await service.findAll(makePagination());

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 })
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should return empty array when no records exist", async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(makePagination());

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe("#findById", () => {
    it("should return the labor cultural when found", async () => {
      repo.findOne.mockResolvedValue(makeLaborCultural({ id: "42" }));

      const result = await service.findById("42");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "42" } });
      expect(result.data.id).toBe("42");
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#update", () => {
    it("should merge partial updates and save", async () => {
      const existing = makeLaborCultural({ id: "3", name: "Old" });
      const merged = makeLaborCultural({ id: "3", name: "New" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);

      const result = await service.update("3", { name: "New" });

      expect(repo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ name: "New" }));
      expect(result.data.name).toBe("New");
    });

    it("should throw NotFoundException when updating a missing labor", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update("999", { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when unique constraint fails on update", async () => {
      repo.findOne.mockResolvedValue(makeLaborCultural());
      repo.merge.mockReturnValue(makeLaborCultural());
      repo.save.mockRejectedValue(makeUniqueViolation("labores_culturales_nombre_key"));

      await expect(
        service.update("1", { name: "DUP" })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("#remove", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const labor = makeLaborCultural({ id: "4", isActive: true });
      repo.findOne.mockResolvedValue(labor);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.remove("4");

      expect(repo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive", async () => {
      repo.findOne.mockResolvedValue(makeLaborCultural({ id: "5", isActive: false }));

      const result = await service.remove("5");

      expect(repo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });
});
