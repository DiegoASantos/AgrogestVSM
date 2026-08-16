import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ProductoresService } from "./productores.service";
import type { ProductorEntity } from "../infrastructure/persistence/entities/productor.entity";

function buildProductor(overrides: Partial<ProductorEntity> = {}): ProductorEntity {
  const now = new Date("2026-07-01T00:00:00.000Z");

  return {
    id: "1",
    publicId: "productor-public-1",
    entityType: "persona",
    documentTypeId: 1,
    documentNumber: "12345678",
    firstName: "Juan",
    lastName: "Perez",
    phone: null,
    email: null,
    address: null,
    isActive: true,
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    parcelas: [],
    ...overrides
  };
}

function buildService(
  options: {
    existingProductor?: ProductorEntity | null;
    findAllResult?: [ProductorEntity[], number];
    hasActiveParcela?: boolean;
    hasAssignedParcela?: boolean;
  } = {}
) {
  const queryBuilder = {
    orderBy: vi.fn(() => queryBuilder),
    addOrderBy: vi.fn(() => queryBuilder),
    skip: vi.fn(() => queryBuilder),
    take: vi.fn(() => queryBuilder),
    andWhere: vi.fn(() => queryBuilder),
    getManyAndCount: vi.fn(async () => options.findAllResult ?? [[], 0])
  };
  const repository = {
    create: vi.fn((value: Partial<ProductorEntity>) => buildProductor(value)),
    save: vi.fn(async (value: ProductorEntity) => value),
    findOne: vi.fn(async () => options.existingProductor ?? null),
    findAndCount: vi.fn(),
    createQueryBuilder: vi.fn(() => queryBuilder)
  };
  const parcelasService = {
    hasActiveParcelByProductorId: vi.fn(
      async () => options.hasActiveParcela ?? false
    ),
    hasParcelAssignedToAgronomo: vi.fn(
      async () => options.hasAssignedParcela ?? false
    )
  };

  const service = new ProductoresService(
    repository as never,
    {} as never,
    parcelasService as never,
    {} as never
  );

  return { parcelasService, queryBuilder, repository, service };
}

describe("ProductoresService", () => {
  describe("create", () => {
    it("creates a persona without document data when names are complete", async () => {
      const { repository, service } = buildService();

      const result = await service.create({
        entityType: "persona",
        firstName: "Juan",
        lastName: "Perez"
      });

      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "persona",
          documentTypeId: null,
          documentNumber: null,
          firstName: "Juan",
          lastName: "Perez",
          isActive: false
        })
      );
      expect(result.data).toMatchObject({
        entityType: "persona",
        documentTypeId: null,
        documentNumber: null,
        firstName: "Juan",
        lastName: "Perez"
      });
    });

    it("checks document uniqueness when a persona document is provided", async () => {
      const { repository, service } = buildService();

      const result = await service.create({
        entityType: "persona",
        documentTypeId: 1,
        documentNumber: "12345678",
        firstName: "Juan",
        lastName: "Perez"
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          documentTypeId: 1,
          documentNumber: "12345678"
        }
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "persona",
          documentTypeId: 1,
          documentNumber: "12345678",
          lastName: "Perez"
        })
      );
      expect(result.data).toMatchObject({
        entityType: "persona",
        documentTypeId: 1,
        documentNumber: "12345678"
      });
    });

    it("rejects a persona without required names", async () => {
      const { repository, service } = buildService();

      await expect(
        service.create({
          entityType: "persona",
          firstName: "Juan",
          documentTypeId: 1,
          documentNumber: "12345678"
        })
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("rejects duplicate persona documents", async () => {
      const { service } = buildService({
        existingProductor: buildProductor({ id: "existing-id" })
      });

      await expect(
        service.create({
          entityType: "persona",
          documentTypeId: 1,
          documentNumber: "12345678",
          firstName: "Juan",
          lastName: "Perez"
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("rejects partial persona document data", async () => {
      const { repository, service } = buildService();

      await expect(
        service.create({
          entityType: "persona",
          documentTypeId: 1,
          firstName: "Juan",
          lastName: "Perez"
        })
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("creates a fundo without document data and clears lastName", async () => {
      const { repository, service } = buildService();

      const result = await service.create({
        entityType: "fundo",
        firstName: "Fundo La Esperanza",
        lastName: "No debe persistir"
      });

      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "fundo",
          documentTypeId: null,
          documentNumber: null,
          firstName: "Fundo La Esperanza",
          lastName: null
        })
      );
      expect(result.data).toMatchObject({
        entityType: "fundo",
        documentTypeId: null,
        documentNumber: null,
        firstName: "Fundo La Esperanza",
        lastName: null
      });
    });

    it("requires a name for cooperativas", async () => {
      const { repository, service } = buildService();

      await expect(
        service.create({
          entityType: "cooperativa"
        })
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.save).not.toHaveBeenCalled();
    });

    it("rejects creating an active producer without an active parcela", async () => {
      const { service } = buildService();

      await expect(
        service.create({
          entityType: "persona",
          firstName: "Juan",
          lastName: "Perez",
          isActive: true
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("records the agronomist who creates a producer for its first parcela", async () => {
      const { repository, service } = buildService();

      await service.create(
        {
          entityType: "persona",
          firstName: "Juana",
          lastName: "Rios"
        },
        { userId: "agronomo-1", roles: ["AGRONOMO"] }
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdByUserId: "agronomo-1" })
      );
    });
  });

  describe("derived state", () => {
    it("rejects a producer state that disagrees with its active parcelas", async () => {
      const { service } = buildService({
        existingProductor: buildProductor({ isActive: true }),
        hasActiveParcela: true
      });

      await expect(
        service.update("1", { isActive: false })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("authorization", () => {
    it("hides a producer outside the agronomist scope", async () => {
      const { service } = buildService({
        existingProductor: buildProductor({ createdByUserId: "agronomo-2" })
      });

      await expect(
        service.findById("1", {
          userId: "agronomo-1",
          roles: ["AGRONOMO"]
        })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("allows an agronomist to read a producer with an assigned parcela", async () => {
      const { service } = buildService({
        existingProductor: buildProductor({ createdByUserId: "agronomo-2" }),
        hasAssignedParcela: true
      });

      const result = await service.findById("1", {
        userId: "agronomo-1",
        roles: ["AGRONOMO"]
      });

      expect(result.data).toMatchObject({ id: "1" });
    });
  });

  describe("findAll", () => {
    it("applies pagination, active filter and simple search", async () => {
      const productor = buildProductor({
        firstName: "Maria",
        lastName: "Garcia"
      });
      const { queryBuilder, service } = buildService({
        findAllResult: [[productor], 1]
      });

      const result = await service.findAll({
        page: 2,
        limit: 10,
        search: "garcia",
        activo: true,
        get skip() {
          return 10;
        },
        get take() {
          return 10;
        }
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "productor.activo",
        "DESC"
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "productor.activo = :isActive",
        { isActive: true }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 2,
        limit: 10
      });
    });
  });
});
