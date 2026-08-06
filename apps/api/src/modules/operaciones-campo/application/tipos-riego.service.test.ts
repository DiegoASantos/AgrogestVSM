import { ConflictException, NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TipoRiegoEntity } from "../infrastructure/persistence/entities/tipo-riego.entity";
import { TiposRiegoService } from "./tipos-riego.service";

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

function asRepo(repo: RepoMock): Repository<TipoRiegoEntity> {
  return repo as unknown as Repository<TipoRiegoEntity>;
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

function makeTipoRiego(overrides: Partial<TipoRiegoEntity> = {}): TipoRiegoEntity {
  return {
    id: "1",
    name: "Riego por goteo",
    description: "Sistema de riego por goteo",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides
  } as TipoRiegoEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

describe("TiposRiegoService", () => {
  let repo: RepoMock;
  let service: TiposRiegoService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new TiposRiegoService(asRepo(repo));
  });

  describe("#create", () => {
    it("should persist a new tipo de riego with default isActive true", async () => {
      const dto = { name: "Riego por aspersión", description: "Aspersores automáticos" };
      const entity = makeTipoRiego({ id: "2", name: "Riego por aspersión" });
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Riego por aspersión",
          description: "Aspersores automáticos",
          isActive: true
        })
      );
      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Riego por aspersión");
    });

    it("should throw ConflictException when unique constraint [tipos_riego_nombre_key] fails", async () => {
      repo.create.mockReturnValue(makeTipoRiego());
      repo.save.mockRejectedValue(makeUniqueViolation("tipos_riego_nombre_key"));

      await expect(
        service.create({ name: "DUP" })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("#findAll", () => {
    it("should return paginated results ordered by name ASC", async () => {
      repo.findAndCount.mockResolvedValue([[makeTipoRiego()], 1]);

      const result = await service.findAll(makePagination());

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });
  });

  describe("#findById", () => {
    it("should return the tipo de riego when found", async () => {
      repo.findOne.mockResolvedValue(makeTipoRiego({ id: "7", name: "Inundación" }));

      const result = await service.findById("7");

      expect(result.data.id).toBe("7");
      expect(result.data.name).toBe("Inundación");
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#update", () => {
    it("should merge partial updates and save", async () => {
      const existing = makeTipoRiego({ id: "3", name: "Old", description: "Old desc" });
      const merged = makeTipoRiego({ id: "3", name: "New", description: "Old desc" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);

      const result = await service.update("3", { name: "New" });

      expect(repo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ name: "New" }));
      expect(result.data.name).toBe("New");
      expect(result.data.description).toBe("Old desc");
    });

    it("should throw NotFoundException when updating a missing tipo de riego", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update("999", { name: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("#remove", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const tipoRiego = makeTipoRiego({ id: "4", isActive: true });
      repo.findOne.mockResolvedValue(tipoRiego);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.remove("4");

      expect(repo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive", async () => {
      repo.findOne.mockResolvedValue(makeTipoRiego({ id: "5", isActive: false }));

      const result = await service.remove("5");

      expect(repo.save).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });
});
