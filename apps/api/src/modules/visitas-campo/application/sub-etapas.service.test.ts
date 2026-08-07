import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubEtapaEntity } from "../infrastructure/persistence/entities/sub-etapa.entity";
import { SubEtapasService } from "./sub-etapas.service";

type RepoMock = { find: ReturnType<typeof vi.fn>; findAndCount: ReturnType<typeof vi.fn>; findOne: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; merge: ReturnType<typeof vi.fn> };
function makeRepo(): RepoMock { return { find: vi.fn(), findAndCount: vi.fn(), findOne: vi.fn(), create: vi.fn(), save: vi.fn(), merge: vi.fn() }; }
function makePagination(overrides: Partial<{ page: number; limit: number }> = {}) { const page = overrides.page ?? 1; const limit = overrides.limit ?? 50; return { page, limit, skip: (page - 1) * limit, take: limit } as unknown as import("../../../common/dto/pagination-query.dto").PaginationQueryDto; }
function makeSubEtapa(overrides: Partial<SubEtapaEntity> = {}): SubEtapaEntity { return { id: "1", etapaFenologicaId: "10", name: "Sub-etapa A", sortOrder: 1, percentage: "50", description: null, isActive: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), etapaFenologica: undefined as unknown as SubEtapaEntity["etapaFenologica"], visitasCampo: [], ...overrides } as SubEtapaEntity; }
function makeUQ(constraint: string) { return new QueryFailedError("insert", [], { code: "23505", constraint } as unknown as Error); }

describe("SubEtapasService", () => {
  let subRepo: RepoMock;
  let etapaRepo: RepoMock;
  let service: SubEtapasService;
  beforeEach(() => { vi.clearAllMocks(); subRepo = makeRepo(); etapaRepo = makeRepo(); service = new SubEtapasService(subRepo as never, etapaRepo as never); });

  describe("#create", () => {
    it("should validate parent is Etapa type and persist", async () => {
      etapaRepo.findOne.mockResolvedValue({ id: "10", type: "Etapa" } as never);
      const entity = makeSubEtapa({ id: "2" });
      subRepo.create.mockReturnValue(entity);
      subRepo.save.mockResolvedValue(entity);
      const result = await service.create({ etapaFenologicaId: "10", name: "Sub A", sortOrder: 1 });
      expect(result.success).toBe(true);
    });

    it("should throw BadRequestException when parent is not Etapa type", async () => {
      etapaRepo.findOne.mockResolvedValue({ id: "10", type: "SubEtapa" } as never);
      await expect(service.create({ etapaFenologicaId: "10", name: "X", sortOrder: 1 })).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException on name duplicate", async () => {
      etapaRepo.findOne.mockResolvedValue({ id: "10", type: "Etapa" } as never);
      subRepo.create.mockReturnValue(makeSubEtapa());
      subRepo.save.mockRejectedValue(makeUQ("sub_etapas_etapa_nombre_key"));
      await expect(service.create({ etapaFenologicaId: "10", name: "DUP", sortOrder: 1 })).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException on sortOrder duplicate", async () => {
      etapaRepo.findOne.mockResolvedValue({ id: "10", type: "Etapa" } as never);
      subRepo.create.mockReturnValue(makeSubEtapa());
      subRepo.save.mockRejectedValue(makeUQ("sub_etapas_etapa_orden_key"));
      await expect(service.create({ etapaFenologicaId: "10", name: "X", sortOrder: 1 })).rejects.toThrow(ConflictException);
    });
  });

  describe("#findAll", () => {
    it("should return paginated with filters", async () => {
      subRepo.findAndCount.mockResolvedValue([[makeSubEtapa()], 1]);
      const result = await service.findAll({ etapa_fenologica_id: "10", estado: true } as never, makePagination());
      expect(result.data).toHaveLength(1);
    });
  });

  describe("#findById", () => {
    it("should return sub etapa when found", async () => { subRepo.findOne.mockResolvedValue(makeSubEtapa({ id: "5" })); expect((await service.findById("5")).data.id).toBe("5"); });
    it("should throw NotFoundException", async () => { subRepo.findOne.mockResolvedValue(null); await expect(service.findById("999")).rejects.toThrow(NotFoundException); });
  });

  describe("#update", () => {
    it("should merge partial updates", async () => {
      subRepo.findOne.mockResolvedValue(makeSubEtapa({ id: "3", name: "Old" }));
      const merged = makeSubEtapa({ id: "3", name: "New" });
      subRepo.merge.mockReturnValue(merged);
      subRepo.save.mockResolvedValue(merged);
      const result = await service.update("3", { name: "New" });
      expect(result.data.name).toBe("New");
    });
  });

  describe("#remove", () => {
    it("should soft-delete", async () => {
      subRepo.findOne.mockResolvedValue(makeSubEtapa({ id: "4", isActive: true }));
      subRepo.save.mockImplementation(async (e) => e);
      expect((await service.remove("4")).data.isActive).toBe(false);
    });
  });
});
