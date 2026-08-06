import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { ObjectLiteral, Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LaborCulturalEntity } from "../../operaciones-campo/infrastructure/persistence/entities/labor-cultural.entity";
import type { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import type { VisitaLaborCulturalEntity } from "../infrastructure/persistence/entities/visita-labor-cultural.entity";
import { VisitaLaboresCulturalesService } from "./visita-labores-culturales.service";

type VisitaLaboresRepoMock = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function makeVisitaLaboresRepo(): VisitaLaboresRepoMock {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    remove: vi.fn()
  };
}

type SimpleRepoMock = {
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
};

function makeSimpleRepo(): SimpleRepoMock {
  return {
    findOne: vi.fn(),
    find: vi.fn()
  };
}

function asRepo<T extends ObjectLiteral>(repo: Record<string, ReturnType<typeof vi.fn>>): Repository<T> {
  return repo as unknown as Repository<T>;
}

function makeVisitaLaborCultural(overrides: Partial<VisitaLaborCulturalEntity> = {}): VisitaLaborCulturalEntity {
  return {
    id: "1",
    visitaId: "100",
    laborCulturalId: "50",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    visita: undefined as unknown as VisitaLaborCulturalEntity["visita"],
    laborCultural: undefined as unknown as VisitaLaborCulturalEntity["laborCultural"],
    ...overrides
  } as VisitaLaborCulturalEntity;
}

function makeLaborCultural(overrides: Partial<LaborCulturalEntity> = {}): LaborCulturalEntity {
  return {
    id: "50",
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

function makeVisita(overrides: Partial<VisitaCampoEntity> = {}): VisitaCampoEntity {
  return {
    id: "100",
    ...overrides
  } as VisitaCampoEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

function makeForeignKeyViolation() {
  const driverError = { code: "23503" };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

describe("VisitaLaboresCulturalesService", () => {
  let visitaLaboresRepo: VisitaLaboresRepoMock;
  let visitasCampoRepo: SimpleRepoMock;
  let laboresCulturalesRepo: SimpleRepoMock;
  let service: VisitaLaboresCulturalesService;

  beforeEach(() => {
    vi.clearAllMocks();
    visitaLaboresRepo = makeVisitaLaboresRepo();
    visitasCampoRepo = makeSimpleRepo();
    laboresCulturalesRepo = makeSimpleRepo();
    service = new VisitaLaboresCulturalesService(
      asRepo<VisitaLaborCulturalEntity>(visitaLaboresRepo),
      asRepo<VisitaCampoEntity>(visitasCampoRepo),
      asRepo<LaborCulturalEntity>(laboresCulturalesRepo)
    );
  });

  describe("#create", () => {
    const visitaId = "100";
    const createDto = { laborCulturalId: 50 };

    it("should create a labor without category upsert when laborCultural has no categoryCode", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      const laborCultural = makeLaborCultural({ categoryCode: null });
      laboresCulturalesRepo.findOne.mockResolvedValue(laborCultural);
      const entity = makeVisitaLaborCultural({ id: "2", visitaId: "100", laborCulturalId: "50", laborCultural });
      visitaLaboresRepo.create.mockReturnValue(entity);
      visitaLaboresRepo.save.mockResolvedValue(entity);

      const result = await service.create(visitaId, createDto);

      expect(visitasCampoRepo.findOne).toHaveBeenCalledWith({ where: { id: "100" } });
      expect(laboresCulturalesRepo.findOne).toHaveBeenCalledWith({
        where: { id: "50", isActive: true }
      });
      expect(laboresCulturalesRepo.find).not.toHaveBeenCalled();
      expect(visitaLaboresRepo.delete).not.toHaveBeenCalled();
      expect(visitaLaboresRepo.create).toHaveBeenCalledWith({
        visitaId: "100",
        laborCulturalId: "50"
      });
      expect(result.success).toBe(true);
      expect(result.data.laborCulturalId).toBe("50");
    });

    it("should delete same-category labores before creating when labor has categoryCode", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      const laborCultural = makeLaborCultural({ categoryCode: "RIEGO" });
      laboresCulturalesRepo.findOne.mockResolvedValue(laborCultural);
      laboresCulturalesRepo.find.mockResolvedValue([{ id: "51" }, { id: "52" }]);
      const entity = makeVisitaLaborCultural({ id: "3", visitaId: "100", laborCulturalId: "50", laborCultural });
      visitaLaboresRepo.delete.mockResolvedValue({ affected: 2 } as never);
      visitaLaboresRepo.create.mockReturnValue(entity);
      visitaLaboresRepo.save.mockResolvedValue(entity);

      const result = await service.create(visitaId, createDto);

      expect(laboresCulturalesRepo.find).toHaveBeenCalledWith({
        select: { id: true },
        where: { categoryCode: "RIEGO" }
      });
      expect(visitaLaboresRepo.delete).toHaveBeenCalledWith({
        visitaId: "100",
        laborCulturalId: expect.objectContaining({ _type: "in" })
      });
      expect(result.success).toBe(true);
      expect(result.data.laborCulturalId).toBe("50");
    });

    it("should not call delete when category has no other labores", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      const laborCultural = makeLaborCultural({ categoryCode: "SOLO" });
      laboresCulturalesRepo.findOne.mockResolvedValue(laborCultural);
      laboresCulturalesRepo.find.mockResolvedValue([]);
      const entity = makeVisitaLaborCultural({ id: "4", visitaId: "100", laborCulturalId: "50", laborCultural });
      visitaLaboresRepo.create.mockReturnValue(entity);
      visitaLaboresRepo.save.mockResolvedValue(entity);

      await service.create(visitaId, createDto);

      expect(visitaLaboresRepo.delete).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when visita does not exist", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(null);

      await expect(service.create(visitaId, createDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when labor cultural does not exist", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      laboresCulturalesRepo.findOne.mockResolvedValue(null);

      await expect(service.create(visitaId, createDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when unique constraint [visita_labores_culturales_visita_labor_key] fails", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      laboresCulturalesRepo.findOne.mockResolvedValue(makeLaborCultural({ categoryCode: null }));
      visitaLaboresRepo.create.mockReturnValue(makeVisitaLaborCultural());
      visitaLaboresRepo.save.mockRejectedValue(
        makeUniqueViolation("visita_labores_culturales_visita_labor_key")
      );

      await expect(service.create(visitaId, createDto)).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [23503] occurs on save", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      laboresCulturalesRepo.findOne.mockResolvedValue(makeLaborCultural({ categoryCode: null }));
      visitaLaboresRepo.create.mockReturnValue(makeVisitaLaborCultural());
      visitaLaboresRepo.save.mockRejectedValue(makeForeignKeyViolation());

      await expect(service.create(visitaId, createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("#findByVisitaId", () => {
    it("should return labores with laborCultural relations for the visita", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      const labor = makeVisitaLaborCultural({
        id: "10",
        visitaId: "100",
        laborCultural: makeLaborCultural({ id: "50", name: "Riego" })
      });
      visitaLaboresRepo.find.mockResolvedValue([labor]);

      const result = await service.findByVisitaId("100");

      expect(visitasCampoRepo.findOne).toHaveBeenCalledWith({ where: { id: "100" } });
      expect(visitaLaboresRepo.find).toHaveBeenCalledWith({
        where: { visitaId: "100" },
        relations: { laborCultural: true },
        order: { id: "ASC" }
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].laborCultural!.name).toBe("Riego");
      expect(result.meta).toEqual({ count: 1 });
    });

    it("should throw NotFoundException when visita does not exist", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(null);

      await expect(service.findByVisitaId("999")).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when visita has no labores", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      visitaLaboresRepo.find.mockResolvedValue([]);

      const result = await service.findByVisitaId("100");

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#remove", () => {
    it("should hard-delete the labor via repository.remove and return the deleted entity", async () => {
      const labor = makeVisitaLaborCultural({ id: "20" });
      visitaLaboresRepo.findOne.mockResolvedValue(labor);
      visitaLaboresRepo.remove.mockResolvedValue(labor);

      const result = await service.remove("20");

      expect(visitaLaboresRepo.findOne).toHaveBeenCalledWith({ where: { id: "20" } });
      expect(visitaLaboresRepo.remove).toHaveBeenCalledWith(labor);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe("20");
    });

    it("should throw NotFoundException when labor does not exist", async () => {
      visitaLaboresRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });
});
