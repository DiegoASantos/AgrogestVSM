import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import type { DetalleNutrienteEntity } from "../infrastructure/persistence/entities/detalle-nutriente.entity";
import type { NutrienteEntity } from "../infrastructure/persistence/entities/nutriente.entity";
import { NutritionCatalogsService } from "./nutrition-catalogs.service";

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

function makeNutriente(overrides: Partial<NutrienteEntity> = {}): NutrienteEntity {
  return {
    id: "1",
    cultivoId: "10",
    code: "N-001",
    name: "Nitrógeno",
    description: "Nutriente principal",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    cultivo: undefined as unknown as NutrienteEntity["cultivo"],
    details: [],
    ...overrides
  } as NutrienteEntity;
}

function makeDetalleNutriente(overrides: Partial<DetalleNutrienteEntity> = {}): DetalleNutrienteEntity {
  return {
    id: "1",
    nutrientId: "1",
    name: "Nitrógeno foliar",
    description: "Aplicación foliar",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    nutriente: undefined as unknown as DetalleNutrienteEntity["nutriente"],
    ...overrides
  } as DetalleNutrienteEntity;
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

describe("NutritionCatalogsService", () => {
  let nutrientesRepo: RepoMock;
  let detallesRepo: RepoMock;
  let cultivosRepo: RepoMock;
  let service: NutritionCatalogsService;

  beforeEach(() => {
    vi.clearAllMocks();
    nutrientesRepo = makeRepo();
    detallesRepo = makeRepo();
    cultivosRepo = makeRepo();
    service = new NutritionCatalogsService(
      asRepo<NutrienteEntity>(nutrientesRepo),
      asRepo<DetalleNutrienteEntity>(detallesRepo),
      asRepo<CultivoEntity>(cultivosRepo)
    );
  });

  describe("#findAllNutrients", () => {
    it("should return paginated nutrients with relations including cultivo and details", async () => {
      const nutrient = makeNutriente();
      nutrientesRepo.findAndCount.mockResolvedValue([[nutrient], 1]);

      const result = await service.findAllNutrients(makePagination());

      expect(nutrientesRepo.findAndCount).toHaveBeenCalledWith({
        relations: { cultivo: true, details: true },
        order: { cultivoId: "ASC", name: "ASC", details: { name: "ASC" } },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });

    it("should return an empty array with zero meta when there are no nutrients", async () => {
      nutrientesRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllNutrients(makePagination());

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("#findNutrientById", () => {
    it("should return the nutrient with relations when found", async () => {
      const nutrient = makeNutriente({ id: "5" });
      nutrientesRepo.findOne.mockResolvedValue(nutrient);

      const result = await service.findNutrientById("5");

      expect(nutrientesRepo.findOne).toHaveBeenCalledWith({
        where: { id: "5" },
        relations: { cultivo: true, details: true },
        order: { details: { name: "ASC" } }
      });
      expect(result.success).toBe(true);
      expect(result.data.id).toBe("5");
    });

    it("should throw NotFoundException when nutrient does not exist", async () => {
      nutrientesRepo.findOne.mockResolvedValue(null);

      await expect(service.findNutrientById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#createNutrient", () => {
    const validDto = {
      cultivoId: "10",
      name: "Potasio",
      description: "Nutriente K",
      isActive: true
    };

    it("should validate cultivo FK and persist the nutrient, returning success envelope", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      const entity = makeNutriente({ id: "2", name: "Potasio" });
      nutrientesRepo.create.mockReturnValue(entity);
      nutrientesRepo.save.mockResolvedValue(entity);
      nutrientesRepo.findOne.mockResolvedValue(entity);

      const result = await service.createNutrient(validDto);

      expect(cultivosRepo.findOne).toHaveBeenCalledWith({ where: { id: "10" } });
      expect(nutrientesRepo.create).toHaveBeenCalledWith({
        cultivoId: "10",
        name: "Potasio",
        description: "Nutriente K",
        isActive: true
      });
      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Potasio");
    });

    it("should default description to null and isActive to true when not provided", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      nutrientesRepo.create.mockReturnValue(makeNutriente());
      nutrientesRepo.save.mockResolvedValue(makeNutriente());
      nutrientesRepo.findOne.mockResolvedValue(makeNutriente());

      await service.createNutrient({ cultivoId: "10", name: "Test" });

      expect(nutrientesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null, isActive: true })
      );
    });

    it("should throw BadRequestException when cultivo FK does not exist", async () => {
      cultivosRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createNutrient(validDto)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when unique constraint [nutrientes_cultivo_nombre_key] fails", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      nutrientesRepo.create.mockReturnValue(makeNutriente());
      nutrientesRepo.save.mockRejectedValue(
        makeUniqueViolation("nutrientes_cultivo_nombre_key")
      );

      await expect(service.createNutrient(validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [nutrientes_cultivo_fkey] occurs on save", async () => {
      cultivosRepo.findOne.mockResolvedValue(makeCultivo());
      nutrientesRepo.create.mockReturnValue(makeNutriente());
      nutrientesRepo.save.mockRejectedValue(
        makeForeignKeyViolation("nutrientes_cultivo_fkey")
      );

      await expect(service.createNutrient(validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("#updateNutrient", () => {
    it("should merge partial updates, validate FK if changed, and save", async () => {
      const existing = makeNutriente({ id: "3", name: "Old" });
      const merged = makeNutriente({ id: "3", name: "Updated" });
      nutrientesRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(merged);
      nutrientesRepo.merge.mockReturnValue(merged);
      nutrientesRepo.save.mockResolvedValue(merged);

      const result = await service.updateNutrient("3", { name: "Updated" });

      expect(nutrientesRepo.findOne).toHaveBeenCalledTimes(2);
      expect(nutrientesRepo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ name: "Updated" }));
      expect(result.data.name).toBe("Updated");
    });

    it("should validate new cultivo FK when cultivoId is changed", async () => {
      const existing = makeNutriente({ id: "3", cultivoId: "10" });
      nutrientesRepo.findOne.mockResolvedValue(existing);
      cultivosRepo.findOne.mockResolvedValue(makeCultivo({ id: "20" }));
      nutrientesRepo.merge.mockReturnValue(makeNutriente({ id: "3", cultivoId: "20" }));
      nutrientesRepo.save.mockResolvedValue(makeNutriente({ id: "3", cultivoId: "20" }));

      await service.updateNutrient("3", { cultivoId: "20" });

      expect(cultivosRepo.findOne).toHaveBeenCalledWith({ where: { id: "20" } });
    });

    it("should throw NotFoundException when nutrient does not exist", async () => {
      nutrientesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateNutrient("999", { name: "X" })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when unique constraint [nutrientes_cultivo_nombre_key] fails on update", async () => {
      const existing = makeNutriente();
      nutrientesRepo.findOne.mockResolvedValue(existing);
      nutrientesRepo.merge.mockReturnValue(existing);
      nutrientesRepo.save.mockRejectedValue(
        makeUniqueViolation("nutrientes_cultivo_nombre_key")
      );

      await expect(
        service.updateNutrient("1", { name: "DUP" })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("#removeNutrient", () => {
    it("should soft-delete the nutrient by setting isActive to false", async () => {
      const nutrient = makeNutriente({ id: "6", isActive: true });
      nutrientesRepo.findOne.mockResolvedValue(nutrient);
      nutrientesRepo.save.mockImplementation(async (e) => e);

      const result = await service.removeNutrient("6");

      expect(nutrientesRepo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged nutrient when already inactive", async () => {
      const nutrient = makeNutriente({ id: "7", isActive: false });
      nutrientesRepo.findOne.mockResolvedValue(nutrient);

      const result = await service.removeNutrient("7");

      expect(nutrientesRepo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when nutrient does not exist", async () => {
      nutrientesRepo.findOne.mockResolvedValue(null);

      await expect(service.removeNutrient("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findAllDetails", () => {
    it("should return paginated details with nested nutriente.cultivo relations", async () => {
      const detail = makeDetalleNutriente();
      detallesRepo.findAndCount.mockResolvedValue([[detail], 1]);

      const result = await service.findAllDetails(makePagination());

      expect(detallesRepo.findAndCount).toHaveBeenCalledWith({
        relations: { nutriente: { cultivo: true } },
        order: { nutrientId: "ASC", name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should return an empty array with zero meta when no details exist", async () => {
      detallesRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllDetails(makePagination());

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe("#findDetailById", () => {
    it("should return the detail with nutrition relations when found", async () => {
      const detail = makeDetalleNutriente({ id: "8" });
      detallesRepo.findOne.mockResolvedValue(detail);

      const result = await service.findDetailById("8");

      expect(detallesRepo.findOne).toHaveBeenCalledWith({
        where: { id: "8" },
        relations: { nutriente: { cultivo: true } }
      });
      expect(result.success).toBe(true);
      expect(result.data.id).toBe("8");
    });

    it("should throw NotFoundException when detail does not exist", async () => {
      detallesRepo.findOne.mockResolvedValue(null);

      await expect(service.findDetailById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#createDetail", () => {
    const validDetailDto = {
      nutrientId: "1",
      name: "Nitrógeno urea",
      description: "A base de urea",
      isActive: true
    };

    it("should validate nutrient FK and persist the detail", async () => {
      nutrientesRepo.findOne.mockResolvedValue(makeNutriente());
      const detail = makeDetalleNutriente({ id: "3", name: "Nitrógeno urea" });
      detallesRepo.create.mockReturnValue(detail);
      detallesRepo.save.mockResolvedValue(detail);
      detallesRepo.findOne.mockResolvedValue(detail);

      const result = await service.createDetail(validDetailDto);

      expect(nutrientesRepo.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(detallesRepo.create).toHaveBeenCalledWith({
        nutrientId: "1",
        name: "Nitrógeno urea",
        description: "A base de urea",
        isActive: true
      });
      expect(result.success).toBe(true);
    });

    it("should throw BadRequestException when nutrient FK does not exist", async () => {
      nutrientesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createDetail(validDetailDto)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when unique constraint [detalle_nutrientes_nutriente_nombre_key] fails", async () => {
      nutrientesRepo.findOne.mockResolvedValue(makeNutriente());
      detallesRepo.create.mockReturnValue(makeDetalleNutriente());
      detallesRepo.save.mockRejectedValue(
        makeUniqueViolation("detalle_nutrientes_nutriente_nombre_key")
      );

      await expect(
        service.createDetail(validDetailDto)
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [detalle_nutrientes_nutriente_fkey] occurs", async () => {
      nutrientesRepo.findOne.mockResolvedValue(makeNutriente());
      detallesRepo.create.mockReturnValue(makeDetalleNutriente());
      detallesRepo.save.mockRejectedValue(
        makeForeignKeyViolation("detalle_nutrientes_nutriente_fkey")
      );

      await expect(
        service.createDetail(validDetailDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("#updateDetail", () => {
    it("should merge partial updates, validate FK if changed, and save", async () => {
      const existing = makeDetalleNutriente({ id: "4", name: "Old" });
      const merged = makeDetalleNutriente({ id: "4", name: "Updated" });
      detallesRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(merged);
      detallesRepo.merge.mockReturnValue(merged);
      detallesRepo.save.mockResolvedValue(merged);

      const result = await service.updateDetail("4", { name: "Updated" });

      expect(detallesRepo.merge).toHaveBeenCalledWith(existing, expect.objectContaining({ name: "Updated" }));
      expect(result.data.name).toBe("Updated");
    });

    it("should validate new nutrient FK when nutrientId is changed", async () => {
      const existing = makeDetalleNutriente({ id: "4", nutrientId: "1" });
      detallesRepo.findOne.mockResolvedValue(existing);
      nutrientesRepo.findOne.mockResolvedValue(makeNutriente({ id: "2" }));
      detallesRepo.merge.mockReturnValue(makeDetalleNutriente({ id: "4", nutrientId: "2" }));
      detallesRepo.save.mockResolvedValue(makeDetalleNutriente({ id: "4", nutrientId: "2" }));

      await service.updateDetail("4", { nutrientId: "2" });

      expect(nutrientesRepo.findOne).toHaveBeenCalledWith({ where: { id: "2" } });
    });

    it("should throw NotFoundException when detail does not exist", async () => {
      detallesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateDetail("999", { name: "X" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("#removeDetail", () => {
    it("should soft-delete the detail by setting isActive to false", async () => {
      const detail = makeDetalleNutriente({ id: "9", isActive: true });
      detallesRepo.findOne.mockResolvedValue(detail);
      detallesRepo.save.mockImplementation(async (e) => e);

      const result = await service.removeDetail("9");

      expect(detallesRepo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged detail when already inactive", async () => {
      const detail = makeDetalleNutriente({ id: "10", isActive: false });
      detallesRepo.findOne.mockResolvedValue(detail);

      const result = await service.removeDetail("10");

      expect(detallesRepo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when detail does not exist", async () => {
      detallesRepo.findOne.mockResolvedValue(null);

      await expect(service.removeDetail("999")).rejects.toThrow(NotFoundException);
    });
  });
});
