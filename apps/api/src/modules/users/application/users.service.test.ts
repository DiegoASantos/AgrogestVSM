import { ConflictException, NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcrypt", () => ({
  hash: vi.fn()
}));

import { hash } from "bcrypt";

import type { UserEntity } from "../infrastructure/persistence/entities/user.entity";
import { UsersService } from "./users.service";

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

function asRepo(repo: RepoMock): Repository<UserEntity> {
  return repo as unknown as Repository<UserEntity>;
}

function makeAuthQueryBuilder(user: UserEntity | null) {
  return {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getOne: vi.fn().mockResolvedValue(user)
  };
}

function makeAdminQueryBuilder(users: UserEntity[]) {
  return {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue(users),
    getOne: vi.fn().mockResolvedValue(users[0] ?? null)
  };
}

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "1",
    publicId: "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
    firstName: "Juan",
    lastName: "Pérez",
    email: "juan@agrogest.pe",
    phone: null,
    passwordHash: "$2b$10$hashedpassword",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    userRoles: [
      {
        id: 1,
        userId: "1",
        roleId: 1,
        role: { id: 1, code: "ADMIN", name: "Administrador", description: "Admin role", userRoles: [] }
      }
    ],
    parcelas: [],
    visitasCampo: [],
    ...overrides
  } as UserEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

describe("UsersService", () => {
  let repo: RepoMock;
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new UsersService(asRepo(repo));
  });

  describe("#isReady", () => {
    it("should return true", () => {
      expect(service.isReady()).toBe(true);
    });
  });

  describe("#findById", () => {
    it("should return the raw user entity when found", async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      const result = await service.findById("1");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(result).toEqual(user);
    });

    it("should return null when user not found", async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findById("999");

      expect(result).toBeNull();
    });
  });

  describe("#findByPublicId", () => {
    it("should return the raw user when found by publicId", async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      const result = await service.findByPublicId("u1b2c3d4");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { publicId: "u1b2c3d4" } });
      expect(result).toEqual(user);
    });

    it("should return null when user not found by publicId", async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByPublicId("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("#findByPublicIdWithRoles", () => {
    it("should use QueryBuilder with joins and return user with roles", async () => {
      const user = makeUser();
      const qb = makeAuthQueryBuilder(user);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByPublicIdWithRoles("public-1");

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("user");
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith("user.userRoles", "userRole");
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith("userRole.role", "role");
      expect(qb.where).toHaveBeenCalledWith("user.public_id = :publicId", { publicId: "public-1" });
      expect(qb.getOne).toHaveBeenCalled();
      expect(result).toEqual(user);
    });

    it("should return null when no user found with roles", async () => {
      const qb = makeAuthQueryBuilder(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByPublicIdWithRoles("public-1");

      expect(result).toBeNull();
    });
  });

  describe("#findByEmail", () => {
    it("should use case-insensitive email lookup via QueryBuilder", async () => {
      const user = makeUser({ email: "JUAN@agrogest.pe" });
      const qb = makeAuthQueryBuilder(user);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByEmail("  juan@agrogest.pe  ");

      expect(qb.where).toHaveBeenCalledWith(
        "LOWER(user.email) = LOWER(:email)",
        { email: "juan@agrogest.pe" }
      );
      expect(result).toEqual(user);
    });

    it("should return null when no user matches the email", async () => {
      const qb = makeAuthQueryBuilder(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByEmail("nope@test.com");

      expect(result).toBeNull();
    });
  });

  describe("#findAllAdmin", () => {
    it("should return all users with roles via QueryBuilder, ordered by createdAt DESC, max 500", async () => {
      const user = makeUser();
      const qb = makeAdminQueryBuilder([user]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllAdmin();

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("user");
      expect(qb.orderBy).toHaveBeenCalledWith("user.createdAt", "DESC");
      expect(qb.take).toHaveBeenCalledWith(500);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: "1",
        firstName: "Juan",
        lastName: "Pérez",
        email: "juan@agrogest.pe",
        displayName: "Juan Pérez"
      });
      expect(result.meta).toEqual({ count: 1 });
    });

    it("should return empty array when no users exist", async () => {
      const qb = makeAdminQueryBuilder([]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllAdmin();

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#findAdminById", () => {
    it("should return user with roles via QueryBuilder in success envelope", async () => {
      const user = makeUser({ id: "42" });
      const qb = makeAdminQueryBuilder([user]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAdminById("42");

      expect(qb.where).toHaveBeenCalledWith("user.id = :id", { id: "42" });
      expect(result.success).toBe(true);
      expect(result.data.id).toBe("42");
    });

    it("should throw NotFoundException when user not found", async () => {
      const qb = makeAdminQueryBuilder([]);
      qb.getOne.mockResolvedValue(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findAdminById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#createAdmin", () => {
    const validDto = {
      firstName: "María",
      lastName: "García",
      email: "maria@agrogest.pe",
      password: "secret123",
      phone: "999888777",
      isActive: true
    };

    it("should hash password and persist the user, then re-query with roles for response", async () => {
      vi.mocked(hash).mockResolvedValue("$2b$10$hashed" as never);
      const entity = makeUser({ id: "2", firstName: "María", lastName: "García", email: "maria@agrogest.pe" });
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);
      const qb = makeAdminQueryBuilder([entity]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.createAdmin(validDto);

      expect(hash).toHaveBeenCalledWith("secret123", 10);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "María",
          lastName: "García",
          email: "maria@agrogest.pe",
          passwordHash: "$2b$10$hashed",
          phone: "999888777"
        })
      );
      expect(result.success).toBe(true);
      expect(result.data.email).toBe("maria@agrogest.pe");
    });

    it("should default phone to null when not provided", async () => {
      vi.mocked(hash).mockResolvedValue("hash" as never);
      repo.create.mockReturnValue(makeUser());
      repo.save.mockResolvedValue(makeUser());
      const qb = makeAdminQueryBuilder([makeUser()]);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.createAdmin({
        firstName: "Test",
        lastName: "User",
        email: "test@test.com",
        password: "pw123"
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: null })
      );
    });

    it("should throw ConflictException when unique email constraint [ux_usuarios_email_lower] fails", async () => {
      vi.mocked(hash).mockResolvedValue("hash" as never);
      repo.create.mockReturnValue(makeUser());
      repo.save.mockRejectedValue(makeUniqueViolation("ux_usuarios_email_lower"));

      await expect(service.createAdmin(validDto)).rejects.toThrow(ConflictException);
    });

    it("should re-throw unexpected errors", async () => {
      vi.mocked(hash).mockResolvedValue("hash" as never);
      repo.create.mockReturnValue(makeUser());
      repo.save.mockRejectedValue(new Error("disk full"));

      await expect(service.createAdmin(validDto)).rejects.toThrow("disk full");
    });
  });

  describe("#updateAdmin", () => {
    it("should merge fields, hash new password if provided, save and re-query", async () => {
      const existing = makeUser({ id: "3", firstName: "Old" });
      const merged = makeUser({ id: "3", firstName: "Updated" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(merged);
      repo.save.mockResolvedValue(merged);
      vi.mocked(hash).mockResolvedValue("newhash" as never);
      const qb = makeAdminQueryBuilder([merged]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.updateAdmin("3", {
        firstName: "Updated",
        password: "newpassword"
      });

      expect(hash).toHaveBeenCalledWith("newpassword", 10);
      expect(repo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ firstName: "Updated" }));
      expect(merged.passwordHash).toBe("newhash");
      expect(result.data.firstName).toBe("Updated");
    });

    it("should not hash password when not provided or null", async () => {
      const existing = makeUser({ id: "3" });
      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockReturnValue(existing);
      repo.save.mockResolvedValue(existing);
      const qb = makeAdminQueryBuilder([existing]);
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.updateAdmin("3", { firstName: "OnlyName" });

      expect(hash).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when user does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAdmin("999", { firstName: "X" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("#removeAdmin", () => {
    it("should soft-delete by setting isActive to false and re-query for response", async () => {
      const user = makeUser({ id: "4", isActive: true });
      repo.findOne.mockResolvedValue(user);
      repo.save.mockImplementation(async (e) => e);
      const qb = makeAdminQueryBuilder([makeUser({ id: "4", isActive: false })]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.removeAdmin("4");

      expect(repo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive (still re-queries)", async () => {
      const user = makeUser({ id: "5", isActive: false });
      repo.findOne.mockResolvedValue(user);
      const qb = makeAdminQueryBuilder([user]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.removeAdmin("5");

      expect(repo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.removeAdmin("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#updateSelfProfile", () => {
    const publicId = "u1b2c3d4-e5f6-7890-abcd-ef1234567890";

    it("should find user by publicId, merge fields, save, and re-query with roles", async () => {
      const existing = makeUser({ firstName: "Old", lastName: "Name" });
      const qbFind = makeAuthQueryBuilder(existing);
      const qbRequery = makeAuthQueryBuilder(
        makeUser({ firstName: "New", lastName: "Profile" })
      );
      repo.createQueryBuilder
        .mockReturnValueOnce(qbFind)
        .mockReturnValueOnce(qbRequery);
      repo.merge.mockReturnValue(
        makeUser({ firstName: "New", lastName: "Profile" })
      );
      repo.save.mockResolvedValue({});

      const result = await service.updateSelfProfile(publicId, {
        firstName: "New",
        lastName: "Profile",
        email: "updated@agrogest.pe"
      });

      expect(repo.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(repo.merge).toHaveBeenCalledWith(
        existing,
        expect.objectContaining({
          firstName: "New",
          lastName: "Profile",
          email: "updated@agrogest.pe"
        })
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result.firstName).toBe("New");
      expect(result.lastName).toBe("Profile");
    });

    it("should hash and update password when passwordHash is provided", async () => {
      const existing = makeUser();
      const qbFind = makeAuthQueryBuilder(existing);
      const updatedUser = makeUser({ passwordHash: "$2b$hashed" });
      const qbRequery = makeAuthQueryBuilder(updatedUser);
      repo.createQueryBuilder
        .mockReturnValueOnce(qbFind)
        .mockReturnValueOnce(qbRequery);
      repo.merge.mockReturnValue(updatedUser);
      repo.save.mockResolvedValue({});

      const result = await service.updateSelfProfile(publicId, {
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe",
        passwordHash: "$2b$hashed"
      });

      expect(repo.merge).toHaveBeenCalledWith(
        existing,
        expect.objectContaining({ passwordHash: "$2b$hashed" })
      );
      expect(result.passwordHash).toBe("$2b$hashed");
    });

    it("should set phone to a value when provided", async () => {
      const existing = makeUser({ phone: null });
      const qbFind = makeAuthQueryBuilder(existing);
      const updatedUser = makeUser({ phone: "999888777" });
      const qbRequery = makeAuthQueryBuilder(updatedUser);
      repo.createQueryBuilder
        .mockReturnValueOnce(qbFind)
        .mockReturnValueOnce(qbRequery);
      repo.merge.mockReturnValue(updatedUser);
      repo.save.mockResolvedValue({});

      const result = await service.updateSelfProfile(publicId, {
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe",
        phone: "999888777"
      });

      expect(repo.merge).toHaveBeenCalledWith(
        existing,
        expect.objectContaining({ phone: "999888777" })
      );
      expect(result.phone).toBe("999888777");
    });

    it("should not include phone in merge when undefined", async () => {
      const existing = makeUser({ phone: "oldphone" });
      const qbFind = makeAuthQueryBuilder(existing);
      const qbRequery = makeAuthQueryBuilder(existing);
      repo.createQueryBuilder
        .mockReturnValueOnce(qbFind)
        .mockReturnValueOnce(qbRequery);
      repo.merge.mockReturnValue(existing);
      repo.save.mockResolvedValue({});

      await service.updateSelfProfile(publicId, {
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe"
      });

      const mergedWith = repo.merge.mock.calls[0][1] as Record<string, unknown>;
      expect(mergedWith).not.toHaveProperty("phone");
    });

    it("should throw NotFoundException when user not found by publicId", async () => {
      const qb = makeAuthQueryBuilder(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateSelfProfile(publicId, {
          firstName: "X",
          lastName: "Y",
          email: "x@test.com"
        })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException on unique email constraint", async () => {
      const qb = makeAuthQueryBuilder(makeUser());
      repo.createQueryBuilder
        .mockReturnValueOnce(qb)
        .mockReturnValueOnce(makeAuthQueryBuilder(makeUser()));
      repo.merge.mockReturnValue(makeUser());
      repo.save.mockRejectedValue(makeUniqueViolation("ux_usuarios_email_lower"));

      await expect(
        service.updateSelfProfile(publicId, {
          firstName: "Juan",
          lastName: "Perez",
          email: "taken@agrogest.pe"
        })
      ).rejects.toThrow(ConflictException);
    });

    it("should re-throw non-unique-constraint errors", async () => {
      const qb = makeAuthQueryBuilder(makeUser());
      repo.createQueryBuilder
        .mockReturnValueOnce(qb)
        .mockReturnValueOnce(makeAuthQueryBuilder(makeUser()));
      repo.merge.mockReturnValue(makeUser());
      repo.save.mockRejectedValue(new Error("disk full"));

      await expect(
        service.updateSelfProfile(publicId, {
          firstName: "Juan",
          lastName: "Perez",
          email: "juan@agrogest.pe"
        })
      ).rejects.toThrow("disk full");
    });
  });
});
