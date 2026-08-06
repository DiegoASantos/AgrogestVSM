import { NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VariedadEntity } from "../infrastructure/persistence/entities/variedad.entity";
import { VariedadesService } from "./variedades.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn()
  };
}

function asRepo(repo: RepoMock): Repository<VariedadEntity> {
  return repo as unknown as Repository<VariedadEntity>;
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

function makeVariedad(overrides: Partial<VariedadEntity> = {}): VariedadEntity {
  return {
    id: "1",
    publicId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    cultivoId: "10",
    code: "VAR-001",
    name: "Criolla",
    isActive: true,
    cultivo: undefined as unknown as VariedadEntity["cultivo"],
    visitasCampo: [],
    ...overrides
  } as VariedadEntity;
}

describe("VariedadesService", () => {
  let repo: RepoMock;
  let service: VariedadesService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new VariedadesService(asRepo(repo));
  });

  describe("#findAll", () => {
    it("should return paginated results ordered by cultivoId ASC and name ASC with correct meta", async () => {
      const variedad1 = makeVariedad({ id: "1", cultivoId: "10", name: "Criolla" });
      const variedad2 = makeVariedad({ id: "2", cultivoId: "20", name: "Hass" });
      repo.findAndCount.mockResolvedValue([[variedad1, variedad2], 2]);

      const result = await service.findAll(makePagination());

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { cultivoId: "ASC", name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({ id: "1", cultivoId: "10", name: "Criolla" });
      expect(result.data[1]).toMatchObject({ id: "2", cultivoId: "20", name: "Hass" });
      expect(result.meta).toEqual({ total: 2, page: 1, limit: 50, totalPages: 1 });
    });

    it("should return an empty array with zero meta when there are no rows", async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(makePagination());

      expect(result.data).toEqual([]);
      expect(result.meta!.total).toBe(0);
      expect(result.meta!.totalPages).toBe(0);
    });

    it("should apply correct skip and take for paginated query", async () => {
      repo.findAndCount.mockResolvedValue([[], 50]);
      const pagination = makePagination({ page: 3, limit: 10 });

      await service.findAll(pagination);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });

    it("should include code and isActive fields in each response item", async () => {
      const variedad = makeVariedad({ id: "5", code: "BAN-CAV", isActive: false });
      repo.findAndCount.mockResolvedValue([[variedad], 1]);

      const result = await service.findAll(makePagination());

      expect(result.data[0]).toEqual({
        id: "5",
        cultivoId: "10",
        code: "BAN-CAV",
        name: "Criolla",
        isActive: false
      });
    });
  });

  describe("#findById", () => {
    it("should return the variety when it exists", async () => {
      const variedad = makeVariedad({ id: "42", name: "Palillo" });
      repo.findOne.mockResolvedValue(variedad);

      const result = await service.findById("42");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "42" } });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: "42",
        cultivoId: "10",
        code: "VAR-001",
        name: "Palillo",
        isActive: true
      });
    });

    it("should throw NotFoundException when the variety does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findByCultivoId", () => {
    it("should return varieties filtered by cultivoId ordered by name ASC", async () => {
      const variedad1 = makeVariedad({ id: "1", cultivoId: "10", name: "Criolla" });
      const variedad2 = makeVariedad({ id: "2", cultivoId: "10", name: "Hass" });
      repo.find.mockResolvedValue([variedad1, variedad2]);

      const result = await service.findByCultivoId("10");

      expect(repo.find).toHaveBeenCalledWith({
        where: { cultivoId: "10" },
        order: { name: "ASC" }
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe("Criolla");
      expect(result.data[1].name).toBe("Hass");
      expect(result.meta).toEqual({ count: 2 });
    });

    it("should return an empty array with count zero when no varieties exist for the cultivo", async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.findByCultivoId("999");

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });

    it("should return all fields per variety item including isActive and code", async () => {
      const variedad = makeVariedad({ id: "7", cultivoId: "10", code: "AGU-HAS", name: "Hass", isActive: true });
      repo.find.mockResolvedValue([variedad]);

      const result = await service.findByCultivoId("10");

      expect(result.data[0]).toEqual({
        id: "7",
        cultivoId: "10",
        code: "AGU-HAS",
        name: "Hass",
        isActive: true
      });
    });
  });
});
