import {
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoleEntity } from "../infrastructure/persistence/entities/role.entity";
import { RolesService } from "./roles.service";

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

function asRepo(repo: RepoMock): Repository<RoleEntity> {
  return repo as unknown as Repository<RoleEntity>;
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

function makeRole(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 1,
    code: "ADMIN",
    name: "Administrador",
    description: "Acceso completo al sistema",
    userRoles: [],
    ...overrides
  } as RoleEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeForeignKeyViolation() {
  const driverError = { code: "23503" };
  return new QueryFailedError("delete", [], driverError as unknown as Error);
}

describe("RolesService", () => {
  let repo: RepoMock;
  let service: RolesService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new RolesService(asRepo(repo));
  });

  describe("#isReady", () => {
    it("should return true", () => {
      const result = service.isReady();

      expect(result).toBe(true);
    });
  });

  describe("#findById", () => {
    it("should return the raw role entity when found", async () => {
      const role = makeRole({ id: 1, code: "ADMIN" });
      repo.findOne.mockResolvedValue(role);

      const result = await service.findById(1);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(role);
    });

    it("should cast string id to Number in the where clause", async () => {
      repo.findOne.mockResolvedValue(null);

      await service.findById("3");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
    });

    it("should return null when the role is not found", async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("#findByCode", () => {
    it("should return the raw role entity when found by code", async () => {
      const role = makeRole({ code: "AGRONOMO" });
      repo.findOne.mockResolvedValue(role);

      const result = await service.findByCode("AGRONOMO");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { code: "AGRONOMO" } });
      expect(result).toEqual(role);
    });

    it("should return null when no role matches the code", async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByCode("NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("#findAllAdmin", () => {
    it("should return paginated roles ordered by name ASC with correct meta", async () => {
      const role1 = makeRole({ id: 1, name: "Administrador" });
      const role2 = makeRole({ id: 2, name: "Agrónomo", code: "AGRONOMO" });
      repo.findAndCount.mockResolvedValue([[role1, role2], 2]);

      const result = await service.findAllAdmin(makePagination());

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 1,
        code: "ADMIN",
        name: "Administrador",
        description: "Acceso completo al sistema"
      });
      expect(result.meta).toEqual({ total: 2, page: 1, limit: 50, totalPages: 1 });
    });

    it("should return an empty array with zero meta when there are no roles", async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllAdmin(makePagination());

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it("should apply correct skip and take for pagination", async () => {
      repo.findAndCount.mockResolvedValue([[], 30]);
      const pagination = makePagination({ page: 2, limit: 15 });

      await service.findAllAdmin(pagination);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 15, take: 15 })
      );
    });
  });

  describe("#findAdminById", () => {
    it("should return the role wrapped in a success envelope when found", async () => {
      const role = makeRole({ id: 5 });
      repo.findOne.mockResolvedValue(role);

      const result = await service.findAdminById("5");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 5,
        code: "ADMIN",
        name: "Administrador",
        description: "Acceso completo al sistema"
      });
    });

    it("should throw NotFoundException when the role does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findAdminById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#createAdmin", () => {
    it("should persist a new role and return a success envelope with the created entity", async () => {
      const dto = { code: "AGRONOMO", name: "Agrónomo", description: "Rol de campo" };
      const role = makeRole({ id: 2, code: "AGRONOMO", name: "Agrónomo", description: "Rol de campo" });
      repo.create.mockReturnValue(role);
      repo.save.mockResolvedValue(role);

      const result = await service.createAdmin(dto);

      expect(repo.create).toHaveBeenCalledWith({
        code: "AGRONOMO",
        name: "Agrónomo",
        description: "Rol de campo"
      });
      expect(repo.save).toHaveBeenCalledWith(role);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 2,
        code: "AGRONOMO",
        name: "Agrónomo",
        description: "Rol de campo"
      });
    });

    it("should default description to null when not provided", async () => {
      const dto = { code: "VIEWER", name: "Visualizador" };
      repo.create.mockReturnValue(makeRole({ code: "VIEWER", name: "Visualizador", description: null }));
      repo.save.mockResolvedValue(makeRole({ code: "VIEWER", name: "Visualizador", description: null }));

      await service.createAdmin(dto);

      expect(repo.create).toHaveBeenCalledWith({
        code: "VIEWER",
        name: "Visualizador",
        description: null
      });
    });

    it("should throw ConflictException when unique constraint [roles_codigo_key] fails on save", async () => {
      repo.create.mockReturnValue(makeRole());
      repo.save.mockRejectedValue(makeUniqueViolation("roles_codigo_key"));

      await expect(
        service.createAdmin({ code: "ADMIN", name: "Duplicate" })
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when unique constraint [roles_nombre_key] fails on save", async () => {
      repo.create.mockReturnValue(makeRole());
      repo.save.mockRejectedValue(makeUniqueViolation("roles_nombre_key"));

      await expect(
        service.createAdmin({ code: "NEW", name: "Duplicate" })
      ).rejects.toThrow(ConflictException);
    });

    it("should re-throw unexpected errors untouched", async () => {
      repo.create.mockReturnValue(makeRole());
      repo.save.mockRejectedValue(new Error("disk full"));

      await expect(
        service.createAdmin({ code: "X", name: "Y" })
      ).rejects.toThrow("disk full");
    });
  });

  describe("#updateAdmin", () => {
    it("should merge partial updates and return the updated role", async () => {
      const existing = makeRole({ id: 3, name: "Old Name" });
      const merged = makeRole({ id: 3, name: "New Name" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);

      const result = await service.updateAdmin("3", { name: "New Name" });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(repo.merge).toHaveBeenCalledWith(existing, { name: "New Name" });
      expect(repo.save).toHaveBeenCalledWith(merged);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe("New Name");
    });

    it("should update description to null when explicitly passed as null", async () => {
      const existing = makeRole({ id: 3, description: "Old desc" });
      const merged = makeRole({ id: 3, description: null });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);

      const result = await service.updateAdmin("3", { description: null });

      expect(repo.merge).toHaveBeenCalledWith(existing, { description: null });
      expect(result.data.description).toBeNull();
    });

    it("should throw NotFoundException when updating a missing role", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAdmin("999", { name: "X" })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when unique constraint [roles_codigo_key] fails on update", async () => {
      const existing = makeRole();
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(existing);
      repo.save.mockRejectedValue(makeUniqueViolation("roles_codigo_key"));

      await expect(
        service.updateAdmin("1", { code: "DUP" })
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when unique constraint [roles_nombre_key] fails on update", async () => {
      const existing = makeRole();
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(existing);
      repo.save.mockRejectedValue(makeUniqueViolation("roles_nombre_key"));

      await expect(
        service.updateAdmin("1", { name: "DUP" })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("#removeAdmin", () => {
    it("should hard-delete the role via repository.remove and return the deleted role", async () => {
      const role = makeRole({ id: 7 });
      repo.findOne.mockResolvedValue(role);
      repo.remove.mockResolvedValue(role);

      const result = await service.removeAdmin("7");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(repo.remove).toHaveBeenCalledWith(role);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 7,
        code: "ADMIN",
        name: "Administrador",
        description: "Acceso completo al sistema"
      });
    });

    it("should throw NotFoundException when removing a missing role", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.removeAdmin("999")).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when FK violation [23503] prevents delete because the role is in use", async () => {
      repo.findOne.mockResolvedValue(makeRole());
      repo.remove.mockRejectedValue(makeForeignKeyViolation());

      await expect(service.removeAdmin("1")).rejects.toThrow(ConflictException);
    });
  });
});
