import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CultivoEntity } from "../infrastructure/persistence/entities/cultivo.entity";
import { CultivosService } from "./cultivos.service";

/**
 * Service-level integration tests for CultivosService.
 *
 * These tests wire the real service against a duck-typed Repository stub so
 * the whole application-layer flow (create / findAll ordering + take cap /
 * findById + NotFound / update / delete / 23505 conflict handling) is
 * exercised without a live Postgres.
 */

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

function asRepo(repo: RepoMock): Repository<CultivoEntity> {
  return repo as unknown as Repository<CultivoEntity>;
}

function makeCultivo(overrides: Partial<CultivoEntity> = {}): CultivoEntity {
  return {
    id: "1",
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

function makeNotNullViolation(column: string) {
  const driverError = { code: "23502", column };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeCheckViolation(constraint: string) {
  const driverError = { code: "23514", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

describe("CultivosService", () => {
  let repo: RepoMock;
  let service: CultivosService;

  beforeEach(() => {
    repo = makeRepo();
    service = new CultivosService(asRepo(repo));
  });

  describe("create", () => {
    it("persists the cultivo and returns a success envelope", async () => {
      const dto = { code: "CULT-002", name: "Mango", isActive: true };
      const entity = makeCultivo({ id: "2", code: "CULT-002", name: "Mango" });
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({
        code: "CULT-002",
        name: "Mango",
        isActive: true
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: "2",
        code: "CULT-002",
        name: "Mango",
        isActive: true
      });
    });

    it("defaults isActive to true when not provided", async () => {
      repo.create.mockReturnValue(makeCultivo());
      repo.save.mockResolvedValue(makeCultivo());

      await service.create({ code: "BAN", name: "Banano" });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, code: "BAN" })
      );
    });

    it("translates 23505 on cultivos_codigo_key into ConflictException", async () => {
      repo.create.mockReturnValue(makeCultivo());
      repo.save.mockRejectedValue(makeUniqueViolation("cultivos_codigo_key"));

      await expect(service.create({ code: "DUP", name: "x" })).rejects.toThrow(
        ConflictException
      );
    });

    it("translates 23505 on cultivos_nombre_key into ConflictException", async () => {
      repo.create.mockReturnValue(makeCultivo());
      repo.save.mockRejectedValue(makeUniqueViolation("cultivos_nombre_key"));

      await expect(service.create({ code: "CULT", name: "x" })).rejects.toThrow(
        ConflictException
      );
    });

    it("translates 23502 on codigo into BadRequestException", async () => {
      repo.create.mockReturnValue(makeCultivo());
      repo.save.mockRejectedValue(makeNotNullViolation("codigo"));

      await expect(
        service.create({ code: "CULT", name: "x" })
      ).rejects.toThrow(BadRequestException);
    });

    it("translates blank code check violations into BadRequestException", async () => {
      repo.create.mockReturnValue(makeCultivo());
      repo.save.mockRejectedValue(
        makeCheckViolation("cultivos_codigo_not_blank_check")
      );

      await expect(
        service.create({ code: "CULT", name: "x" })
      ).rejects.toThrow(BadRequestException);
    });

    it("re-throws unexpected errors untouched", async () => {
      repo.create.mockReturnValue(makeCultivo());
      repo.save.mockRejectedValue(new Error("disk full"));

      await expect(service.create({ code: "CULT", name: "x" })).rejects.toThrow(
        "disk full"
      );
    });
  });

  describe("findAll", () => {
    it("orders by name ASC and applies pagination skip/take", async () => {
      repo.findAndCount.mockResolvedValue([[makeCultivo()], 1]);

      const result = await service.findAll(makePagination());

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });

    it("returns an empty array when there are no rows", async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(makePagination());

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ total: 0, page: 1, limit: 50, totalPages: 0 });
    });
  });

  describe("findById", () => {
    it("returns the cultivo when it exists", async () => {
      repo.findOne.mockResolvedValue(makeCultivo({ id: "42" }));

      const result = await service.findById("42");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "42" } });
      expect(result.data.id).toBe("42");
    });

    it("throws NotFoundException when the cultivo is missing", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("merges partial updates and saves", async () => {
      const existing = makeCultivo({ id: "3", name: "old" });
      const merged = makeCultivo({ id: "3", name: "new" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);

      const result = await service.update("3", { name: "new" });

      expect(repo.merge).toHaveBeenCalledWith(existing, { name: "new" });
      expect(result.data.name).toBe("new");
    });

    it("throws NotFoundException when updating a missing cultivo", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update("x", { name: "y" })).rejects.toThrow(
        NotFoundException
      );
    });

    it("translates 23505 on update into ConflictException", async () => {
      const existing = makeCultivo();
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(existing);
      repo.save.mockRejectedValue(makeUniqueViolation("cultivos_nombre_key"));

      await expect(
        service.update(existing.id, { name: "dup" })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove (soft-delete via isActive=false)", () => {
    it("sets isActive to false and persists", async () => {
      const existing = makeCultivo({ isActive: true });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (entity) => entity);

      const result = await service.remove(existing.id);

      expect(repo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("throws NotFoundException when deleting a missing cultivo", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("nope")).rejects.toThrow(NotFoundException);
    });
  });
});
