import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EtapaFenologicaEntity } from "../infrastructure/persistence/entities/etapa-fenologica.entity";
import { EtapasFenologicasService } from "./etapas-fenologicas.service";

type RepoMock = { find: ReturnType<typeof vi.fn>; findAndCount: ReturnType<typeof vi.fn>; findOne: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; merge: ReturnType<typeof vi.fn> };
function makeRepo(): RepoMock { return { find: vi.fn(), findAndCount: vi.fn(), findOne: vi.fn(), create: vi.fn(), save: vi.fn(), merge: vi.fn() }; }
function makePagination(overrides: Partial<{ page: number; limit: number }> = {}) { const page = overrides.page ?? 1; const limit = overrides.limit ?? 50; return { page, limit, skip: (page - 1) * limit, take: limit } as unknown as import("../../../common/dto/pagination-query.dto").PaginationQueryDto; }
function makeEtapa(overrides: Partial<EtapaFenologicaEntity> = {}): EtapaFenologicaEntity { return { id: "1", cultivoId: "10", name: "Floracion", description: null, sortOrder: 1, type: "Etapa", isActive: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), cultivo: undefined as unknown as EtapaFenologicaEntity["cultivo"], subEtapas: [], visitasCampo: [], ...overrides } as EtapaFenologicaEntity; }
function makeUQ(constraint: string) { return new QueryFailedError("insert", [], { code: "23505", constraint } as unknown as Error); }

describe("EtapasFenologicasService", () => {
  let etapaRepo: RepoMock;
  let cultivoRepo: RepoMock;
  let service: EtapasFenologicasService;
  beforeEach(() => { vi.clearAllMocks(); etapaRepo = makeRepo(); cultivoRepo = makeRepo(); service = new EtapasFenologicasService(etapaRepo as never, cultivoRepo as never); });

  describe("#create", () => {
    it("should validate cultivo FK and persist", async () => {
      cultivoRepo.findOne.mockResolvedValue({ id: "10" } as never);
      const entity = makeEtapa({ id: "2" });
      etapaRepo.create.mockReturnValue(entity);
      etapaRepo.save.mockResolvedValue(entity);
      const result = await service.create({ cultivoId: "10", name: "Floracion" });
      expect(cultivoRepo.findOne).toHaveBeenCalledWith({ where: { id: "10" } });
      expect(result.success).toBe(true);
    });

    it("should throw BadRequestException when cultivo not found", async () => {
      cultivoRepo.findOne.mockResolvedValue(null);
      await expect(service.create({ cultivoId: "999", name: "X" })).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException on unique constraint", async () => {
      cultivoRepo.findOne.mockResolvedValue({ id: "10" } as never);
      etapaRepo.create.mockReturnValue(makeEtapa());
      etapaRepo.save.mockRejectedValue(makeUQ("etapas_fenologicas_cultivo_id_nombre_key"));
      await expect(service.create({ cultivoId: "10", name: "DUP" })).rejects.toThrow(ConflictException);
    });
  });

  describe("#findAll", () => {
    it("should return paginated with filters", async () => {
      etapaRepo.findAndCount.mockResolvedValue([[makeEtapa()], 1]);
      const result = await service.findAll({ cultivo_id: "10", activa: true } as never, makePagination());
      expect(etapaRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cultivoId: "10", isActive: true } }));
      expect(result.data).toHaveLength(1);
    });
  });

  describe("#findById", () => {
    it("should return etapa when found", async () => {
      etapaRepo.findOne.mockResolvedValue(makeEtapa({ id: "5" }));
      expect((await service.findById("5")).data.id).toBe("5");
    });
    it("should throw NotFoundException when not found", async () => {
      etapaRepo.findOne.mockResolvedValue(null);
      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#update", () => {
    it("should merge partial updates and validate FK if changed", async () => {
      etapaRepo.findOne.mockResolvedValue(makeEtapa({ id: "3" }));
      cultivoRepo.findOne.mockResolvedValue({ id: "20" } as never);
      const merged = makeEtapa({ id: "3", cultivoId: "20" });
      etapaRepo.merge.mockReturnValue(merged);
      etapaRepo.save.mockResolvedValue(merged);
      const result = await service.update("3", { cultivoId: "20" });
      expect(cultivoRepo.findOne).toHaveBeenCalledWith({ where: { id: "20" } });
      expect(result.data.cultivoId).toBe("20");
    });
  });

  describe("#remove", () => {
    it("should soft-delete by setting isActive false", async () => {
      etapaRepo.findOne.mockResolvedValue(makeEtapa({ id: "4", isActive: true }));
      etapaRepo.save.mockImplementation(async (e) => e);
      const result = await service.remove("4");
      expect(result.data.isActive).toBe(false);
    });
  });
});
