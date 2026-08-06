import {
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TipoDocumentoEntity } from "../infrastructure/persistence/entities/tipo-documento.entity";
import { TiposDocumentoService } from "./tipos-documento.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    remove: vi.fn()
  };
}

function asRepo(repo: RepoMock): Repository<TipoDocumentoEntity> {
  return repo as unknown as Repository<TipoDocumentoEntity>;
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

function makeTipoDocumento(overrides: Partial<TipoDocumentoEntity> = {}): TipoDocumentoEntity {
  return {
    id: 1,
    code: "DNI",
    name: "Documento Nacional de Identidad",
    ...overrides
  } as TipoDocumentoEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeForeignKeyViolation() {
  const driverError = { code: "23503" };
  return new QueryFailedError("delete", [], driverError as unknown as Error);
}

describe("TiposDocumentoService", () => {
  let repo: RepoMock;
  let service: TiposDocumentoService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new TiposDocumentoService(asRepo(repo));
  });

  describe("#create", () => {
    it("should persist a new document type and return a success envelope with the created entity", async () => {
      const dto = { code: "RUC", name: "Registro Único de Contribuyente" };
      const entity = makeTipoDocumento({ id: 2, code: "RUC", name: "Registro Único de Contribuyente" });
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({ code: "RUC", name: "Registro Único de Contribuyente" });
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 2, code: "RUC", name: "Registro Único de Contribuyente" });
    });

    it("should throw ConflictException when unique constraint [tipos_documento_codigo_key] fails on save", async () => {
      repo.create.mockReturnValue(makeTipoDocumento());
      repo.save.mockRejectedValue(makeUniqueViolation("tipos_documento_codigo_key"));

      await expect(
        service.create({ code: "DNI", name: "Duplicate" })
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when unique constraint [tipos_documento_nombre_key] fails on save", async () => {
      repo.create.mockReturnValue(makeTipoDocumento());
      repo.save.mockRejectedValue(makeUniqueViolation("tipos_documento_nombre_key"));

      await expect(
        service.create({ code: "NEW", name: "Duplicate" })
      ).rejects.toThrow(ConflictException);
    });

    it("should re-throw unexpected errors untouched", async () => {
      const dto = { code: "DNI", name: "Test" };
      repo.create.mockReturnValue(makeTipoDocumento());
      repo.save.mockRejectedValue(new Error("disk full"));

      await expect(service.create(dto)).rejects.toThrow("disk full");
    });
  });

  describe("#findAll", () => {
    it("should return paginated results ordered by name ASC with correct meta", async () => {
      const entity = makeTipoDocumento();
      repo.findAndCount.mockResolvedValue([[entity], 1]);

      const result = await service.findAll(makePagination());

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({ id: 1, code: "DNI", name: "Documento Nacional de Identidad" });
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });

    it("should return an empty array with zero meta when there are no rows", async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(makePagination());

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ total: 0, page: 1, limit: 50, totalPages: 0 });
    });

    it("should apply correct skip and take for second page", async () => {
      repo.findAndCount.mockResolvedValue([[], 100]);
      const pagination = makePagination({ page: 2, limit: 25 });

      await service.findAll(pagination);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 })
      );
    });
  });

  describe("#findById", () => {
    it("should return the document type when it exists", async () => {
      const entity = makeTipoDocumento({ id: 7 });
      repo.findOne.mockResolvedValue(entity);

      const result = await service.findById("7");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 7, code: "DNI", name: "Documento Nacional de Identidad" });
    });

    it("should throw NotFoundException when the document type does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#update", () => {
    it("should merge partial updates and return the updated entity", async () => {
      const existing = makeTipoDocumento({ id: 3, name: "Old Name" });
      const merged = makeTipoDocumento({ id: 3, name: "New Name" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);

      const result = await service.update("3", { name: "New Name" });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(repo.merge).toHaveBeenCalledWith(existing, { name: "New Name" });
      expect(repo.save).toHaveBeenCalledWith(merged);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe("New Name");
    });

    it("should update only the code when name is not provided", async () => {
      const existing = makeTipoDocumento({ id: 4, code: "OLD" });
      const merged = makeTipoDocumento({ id: 4, code: "NEW" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);

      const result = await service.update("4", { code: "NEW" });

      expect(repo.merge).toHaveBeenCalledWith(existing, { code: "NEW" });
      expect(result.data.code).toBe("NEW");
    });

    it("should throw NotFoundException when updating a missing document type", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update("999", { name: "Whatever" })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when unique constraint [tipos_documento_codigo_key] fails on update", async () => {
      const existing = makeTipoDocumento();
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(existing);
      repo.save.mockRejectedValue(makeUniqueViolation("tipos_documento_codigo_key"));

      await expect(
        service.update("1", { code: "DUP" })
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when unique constraint [tipos_documento_nombre_key] fails on update", async () => {
      const existing = makeTipoDocumento();
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(existing);
      repo.save.mockRejectedValue(makeUniqueViolation("tipos_documento_nombre_key"));

      await expect(
        service.update("1", { name: "DUP" })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("#remove", () => {
    it("should hard-delete the entity via repository.remove and return the deleted entity", async () => {
      const entity = makeTipoDocumento({ id: 5 });
      repo.findOne.mockResolvedValue(entity);
      repo.remove.mockResolvedValue(entity);

      const result = await service.remove("5");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(repo.remove).toHaveBeenCalledWith(entity);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 5, code: "DNI", name: "Documento Nacional de Identidad" });
    });

    it("should throw NotFoundException when removing a missing document type", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when FK violation [23503] prevents delete because the type is in use", async () => {
      repo.findOne.mockResolvedValue(makeTipoDocumento());
      repo.remove.mockRejectedValue(makeForeignKeyViolation());

      await expect(service.remove("1")).rejects.toThrow(ConflictException);
    });
  });
});
