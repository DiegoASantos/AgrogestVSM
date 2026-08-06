import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TipoRiegoEntity } from "../../operaciones-campo/infrastructure/persistence/entities/tipo-riego.entity";
import type { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import type { VisitaRiegoEntity } from "../infrastructure/persistence/entities/visita-riego.entity";
import { VisitaRiegosService } from "./visita-riegos.service";

type VisitaRiegosRepoMock = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function makeVisitaRiegosRepo(): VisitaRiegosRepoMock {
  return {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn()
  };
}

type SimpleRepoMock = {
  findOne: ReturnType<typeof vi.fn>;
};

function makeSimpleRepo(): SimpleRepoMock {
  return { findOne: vi.fn() };
}

function asRepo<T>(repo: Record<string, ReturnType<typeof vi.fn>>): Repository<T> {
  return repo as unknown as Repository<T>;
}

function makeVisitaRiego(overrides: Partial<VisitaRiegoEntity> = {}): VisitaRiegoEntity {
  return {
    id: "1",
    visitaId: "100",
    tipoRiegoId: "10",
    fuenteAgua: "subterranea",
    tipoSuelo: "arenoso",
    humedadSuelo: "optimo",
    estresHidrico: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    visita: undefined as unknown as VisitaRiegoEntity["visita"],
    tipoRiego: undefined as unknown as VisitaRiegoEntity["tipoRiego"],
    ...overrides
  } as VisitaRiegoEntity;
}

function makeVisita(overrides: Partial<VisitaCampoEntity> = {}): VisitaCampoEntity {
  return { id: "100", ...overrides } as VisitaCampoEntity;
}

function makeTipoRiego(overrides: Partial<TipoRiegoEntity> = {}): TipoRiegoEntity {
  return {
    id: "10",
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

function makeForeignKeyViolation() {
  const driverError = { code: "23503" };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

describe("VisitaRiegosService", () => {
  let visitaRiegosRepo: VisitaRiegosRepoMock;
  let visitasCampoRepo: SimpleRepoMock;
  let tiposRiegoRepo: SimpleRepoMock;
  let service: VisitaRiegosService;

  beforeEach(() => {
    vi.clearAllMocks();
    visitaRiegosRepo = makeVisitaRiegosRepo();
    visitasCampoRepo = makeSimpleRepo();
    tiposRiegoRepo = makeSimpleRepo();
    service = new VisitaRiegosService(
      asRepo<VisitaRiegoEntity>(visitaRiegosRepo),
      asRepo<VisitaCampoEntity>(visitasCampoRepo),
      asRepo<TipoRiegoEntity>(tiposRiegoRepo)
    );
  });

  describe("#create", () => {
    const visitaId = "100";
    const validDto = {
      tipoRiegoId: 10,
      fuenteAgua: "subterranea" as const,
      tipoSuelo: "arenoso" as const,
      humedadSuelo: "optimo" as const,
      estresHidrico: false
    };

    it("should validate visita and tipoRiego FK, enforce one-per-visita, and persist", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      tiposRiegoRepo.findOne.mockResolvedValue(makeTipoRiego());
      visitaRiegosRepo.findOne.mockResolvedValue(null);
      const entity = makeVisitaRiego({ id: "2", visitaId: "100", tipoRiegoId: "10" });
      visitaRiegosRepo.create.mockReturnValue(entity);
      visitaRiegosRepo.save.mockResolvedValue(entity);

      const result = await service.create(visitaId, validDto);

      expect(visitasCampoRepo.findOne).toHaveBeenCalledWith({ where: { id: "100" } });
      expect(tiposRiegoRepo.findOne).toHaveBeenCalledWith({ where: { id: "10", isActive: true } });
      expect(visitaRiegosRepo.findOne).toHaveBeenCalledWith({ where: { visitaId: "100" } });
      expect(visitaRiegosRepo.create).toHaveBeenCalledWith({
        visitaId: "100",
        tipoRiegoId: "10",
        fuenteAgua: "subterranea",
        tipoSuelo: "arenoso",
        humedadSuelo: "optimo",
        estresHidrico: false
      });
      expect(result.success).toBe(true);
      expect(result.data.humedadSuelo).toBe("optimo");
    });

    it("should default optional fields to null when not provided", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      tiposRiegoRepo.findOne.mockResolvedValue(makeTipoRiego());
      visitaRiegosRepo.findOne.mockResolvedValue(null);
      visitaRiegosRepo.create.mockReturnValue(makeVisitaRiego());
      visitaRiegosRepo.save.mockResolvedValue(makeVisitaRiego());

      await service.create(visitaId, {
        tipoRiegoId: 10,
        humedadSuelo: "optimo"
      });

      expect(visitaRiegosRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fuenteAgua: null,
          tipoSuelo: null,
          estresHidrico: null
        })
      );
    });

    it("should throw BadRequestException when visita does not exist", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(null);

      await expect(service.create(visitaId, validDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when tipo de riego does not exist or is inactive", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      tiposRiegoRepo.findOne.mockResolvedValue(null);

      await expect(service.create(visitaId, validDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when a riego record already exists for the visita (1:1 constraint)", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      tiposRiegoRepo.findOne.mockResolvedValue(makeTipoRiego());
      visitaRiegosRepo.findOne.mockResolvedValue(makeVisitaRiego({ id: "99" }));

      await expect(service.create(visitaId, validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when DB unique constraint [visita_riegos_visita_id_key] fails on save", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      tiposRiegoRepo.findOne.mockResolvedValue(makeTipoRiego());
      visitaRiegosRepo.findOne.mockResolvedValue(null);
      visitaRiegosRepo.create.mockReturnValue(makeVisitaRiego());
      visitaRiegosRepo.save.mockRejectedValue(
        makeUniqueViolation("visita_riegos_visita_id_key")
      );

      await expect(service.create(visitaId, validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when FK violation [23503] occurs on save", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      tiposRiegoRepo.findOne.mockResolvedValue(makeTipoRiego());
      visitaRiegosRepo.findOne.mockResolvedValue(null);
      visitaRiegosRepo.create.mockReturnValue(makeVisitaRiego());
      visitaRiegosRepo.save.mockRejectedValue(makeForeignKeyViolation());

      await expect(service.create(visitaId, validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("#findByVisitaId", () => {
    it("should return the riego record when it exists for the visita", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      const riego = makeVisitaRiego({ id: "5", visitaId: "100" });
      visitaRiegosRepo.findOne.mockResolvedValue(riego);

      const result = await service.findByVisitaId("100");

      expect(visitasCampoRepo.findOne).toHaveBeenCalledWith({ where: { id: "100" } });
      expect(visitaRiegosRepo.findOne).toHaveBeenCalledWith({ where: { visitaId: "100" } });
      expect(result.success).toBe(true);
      expect(result.data.id).toBe("5");
    });

    it("should return null data when no riego record exists for the visita", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(makeVisita());
      visitaRiegosRepo.findOne.mockResolvedValue(null);

      const result = await service.findByVisitaId("100");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should throw NotFoundException when visita does not exist", async () => {
      visitasCampoRepo.findOne.mockResolvedValue(null);

      await expect(service.findByVisitaId("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#update", () => {
    it("should update individual fields, validate FK if changed, and enforce humedadSuelo required", async () => {
      const existing = makeVisitaRiego({ id: "3", humedadSuelo: "optimo", tipoRiegoId: "10" });
      visitaRiegosRepo.findOne.mockResolvedValue(existing);
      visitaRiegosRepo.save.mockImplementation(async (e) => e);

      const result = await service.update("3", {
        fuenteAgua: "superficial",
        tipoSuelo: "arcilloso"
      });

      expect(existing.fuenteAgua).toBe("superficial");
      expect(existing.tipoSuelo).toBe("arcilloso");
      expect(result.success).toBe(true);
      expect(result.data.fuenteAgua).toBe("superficial");
    });

    it("should validate new tipoRiego FK when tipoRiegoId is changed", async () => {
      const existing = makeVisitaRiego({ id: "3", tipoRiegoId: "10", humedadSuelo: "optimo" });
      visitaRiegosRepo.findOne.mockResolvedValue(existing);
      tiposRiegoRepo.findOne.mockResolvedValue(makeTipoRiego({ id: "20" }));
      visitaRiegosRepo.save.mockImplementation(async (e) => e);

      await service.update("3", { tipoRiegoId: 20 });

      expect(tiposRiegoRepo.findOne).toHaveBeenCalledWith({
        where: { id: "20", isActive: true }
      });
      expect(existing.tipoRiegoId).toBe("20");
    });

    it("should throw BadRequestException when humedadSuelo becomes falsy after update", async () => {
      const existing = makeVisitaRiego({ id: "3", humedadSuelo: "optimo" });
      visitaRiegosRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update("3", { humedadSuelo: "" as never })
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when riego record does not exist", async () => {
      visitaRiegosRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("999", { fuenteAgua: "superficial" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("#remove", () => {
    it("should hard-delete the riego record via repository.remove", async () => {
      const riego = makeVisitaRiego({ id: "6" });
      visitaRiegosRepo.findOne.mockResolvedValue(riego);
      visitaRiegosRepo.remove.mockResolvedValue(riego);

      const result = await service.remove("6");

      expect(visitaRiegosRepo.findOne).toHaveBeenCalledWith({ where: { id: "6" } });
      expect(visitaRiegosRepo.remove).toHaveBeenCalledWith(riego);
      expect(result.success).toBe(true);
    });

    it("should throw NotFoundException when riego record does not exist", async () => {
      visitaRiegosRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(NotFoundException);
    });
  });
});
