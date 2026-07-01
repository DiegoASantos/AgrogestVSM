import { BadRequestException, ConflictException } from "@nestjs/common";
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
    createdAt: now,
    updatedAt: now,
    parcelas: [],
    ...overrides
  };
}

function buildService(options: { existingProductor?: ProductorEntity | null } = {}) {
  const repository = {
    create: vi.fn((value: Partial<ProductorEntity>) => buildProductor(value)),
    save: vi.fn(async (value: ProductorEntity) => value),
    findOne: vi.fn(async () => options.existingProductor ?? null),
    findAndCount: vi.fn()
  };

  const service = new ProductoresService(
    repository as never,
    {} as never,
    {} as never,
    {} as never
  );

  return { repository, service };
}

describe("ProductoresService", () => {
  describe("create", () => {
    it("creates a persona with required document data and checks uniqueness", async () => {
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

    it("rejects a persona without document data", async () => {
      const { repository, service } = buildService();

      await expect(
        service.create({
          entityType: "persona",
          firstName: "Juan"
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
          documentNumber: "12345678"
        })
      ).rejects.toBeInstanceOf(ConflictException);
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
  });
});
